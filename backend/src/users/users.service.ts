import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@/config/configuration';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly encryptionKey: string;
  private readonly encryptionIv: string;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService<AppConfig>,
  ) {
    this.encryptionKey = this.configService.get('encryption.key', {
      infer: true,
    }) || '';
    this.encryptionIv = this.configService.get('encryption.iv', {
      infer: true,
    }) || '';

    if (!this.encryptionKey || !this.encryptionIv) {
      this.logger.warn(
        'Encryption keys not configured. Tokens will not be encrypted.',
      );
    }
  }

  private encryptToken(token: string): string {
    if (!this.encryptionKey || this.encryptionKey.length < 32) {
      return token;
    }

    try {
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey.slice(0, 32)),
        Buffer.from(this.encryptionIv.slice(0, 16)),
      );
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      this.logger.warn('Encryption failed, storing token unencrypted', error);
      return token;
    }
  }

  private decryptToken(token: string): string {
    if (!this.encryptionKey || this.encryptionKey.length < 32) {
      return token;
    }

    try {
      if (!token || token.length < 32) {
        return token;
      }

      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey.slice(0, 32)),
        Buffer.from(this.encryptionIv.slice(0, 16)),
      );
      let decrypted = decipher.update(token, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.warn('Decryption failed, returning token as-is', error);
      return token;
    }
  }

  async createOrUpdateUser(userData: {
    microsoftId: string;
    email: string;
    displayName: string;
    jobTitle?: string;
    avatar?: string;
    microsoftAccessToken: string;
    microsoftRefreshToken: string;
    tokenExpiresAt: Date;
  }): Promise<User> {
    const encryptedAccessToken = this.encryptToken(
      userData.microsoftAccessToken,
    );
    const encryptedRefreshToken = this.encryptToken(
      userData.microsoftRefreshToken,
    );

    const user = await this.userModel.findOneAndUpdate(
      { microsoftId: userData.microsoftId },
      {
        ...userData,
        microsoftAccessToken: encryptedAccessToken,
        microsoftRefreshToken: encryptedRefreshToken,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    return user;
  }

  async findByMicrosoftId(microsoftId: string): Promise<User | null> {
    return this.userModel.findOne({ microsoftId });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email });
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id);
  }

  async updateUser(userId: string, updateDto: UpdateUserDto): Promise<User> {
    if (!updateDto || Object.keys(updateDto).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    const updateData: any = { ...updateDto, updatedAt: new Date() };

    const user = await this.userModel.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async updateTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<User> {
    const encryptedAccessToken = this.encryptToken(accessToken);
    const encryptedRefreshToken = this.encryptToken(refreshToken);

    const user = await this.userModel.findByIdAndUpdate(
      userId,
      {
        microsoftAccessToken: encryptedAccessToken,
        microsoftRefreshToken: encryptedRefreshToken,
        tokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async getDecryptedAccessToken(user: User): Promise<string> {
    return this.decryptToken(user.microsoftAccessToken);
  }

  async getDecryptedRefreshToken(user: User): Promise<string> {
    return this.decryptToken(user.microsoftRefreshToken);
  }

  async getUserProfile(userId: string): Promise<Partial<User> | null> {
    const user = await this.findById(userId);
    if (!user) {
      return null;
    }

    const userObject = (user as any).toObject();
    delete userObject.microsoftAccessToken;
    delete userObject.microsoftRefreshToken;

    return userObject;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userModel.findByIdAndDelete(userId);
  }

  async getUserCount(): Promise<number> {
    return this.userModel.countDocuments();
  }

  async getActiveUsersCount(daysBack: number = 30): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);

    return this.userModel.countDocuments({
      lastLoginAt: { $gte: date },
    });
  }
}
