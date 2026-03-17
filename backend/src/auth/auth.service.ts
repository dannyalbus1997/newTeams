import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConfidentialClientApplication,
  AuthorizationCodeRequest,
  RefreshTokenRequest,
} from '@azure/msal-node';
import { UsersService } from '@/users/users.service';
import { MicrosoftGraphService } from '@/common/services/microsoft-graph.service';
import { AppConfig } from '@/config/configuration';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface MicrosoftAuthUrl {
  url: string;
  codeVerifier?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private cca: ConfidentialClientApplication;
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;
  private redirectUri: string;
  private scopes: string[];

  constructor(
    private configService: ConfigService<AppConfig>,
    private jwtService: JwtService,
    private usersService: UsersService,
    private microsoftGraphService: MicrosoftGraphService,
  ) {
    this.clientId = this.configService.get('azure.clientId', { infer: true }) || '';
    this.clientSecret = this.configService.get('azure.clientSecret', {
      infer: true,
    }) || '';
    this.tenantId = this.configService.get('azure.tenantId', { infer: true }) || '';
    this.redirectUri = this.configService.get('azure.redirectUri', {
      infer: true,
    }) || '';

    // Use Microsoft's recommended .default scope so the token
    // matches the permissions configured on the app registration.
    // This works with app-permission style configuration.
    this.scopes = ['https://graph.microsoft.com/.default'];

    this.cca = new ConfidentialClientApplication({
      auth: {
        clientId: this.clientId,
        authority: `https://login.microsoftonline.com/${this.tenantId}`,
        clientSecret: this.clientSecret,
      },
    });
  }

  async getAuthenticationUrl(): Promise<MicrosoftAuthUrl> {
    try {
      const authCodeUrlParameters = {
        scopes: this.scopes,
        redirectUri: this.redirectUri,
      };

      const response = await this.cca.getAuthCodeUrl(authCodeUrlParameters);
      return { url: response };
    } catch (error) {
      this.logger.error('Failed to generate auth URL', error);
      throw error;
    }
  }

  async exchangeCodeForTokens(code: string): Promise<AuthTokens> {
    try {
      const authCodeRequest: AuthorizationCodeRequest = {
        code,
        scopes: this.scopes,
        redirectUri: this.redirectUri,
      };

      const response = await this.cca.acquireTokenByCode(authCodeRequest);

      return {
        accessToken: response.accessToken,
        refreshToken: (response as any).refreshToken || '',
        expiresIn: response.expiresOn
          ? Math.floor(
              (response.expiresOn.getTime() - Date.now()) / 1000,
            )
          : 3600,
      };
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens', error);
      throw new UnauthorizedException('Invalid authorization code');
    }
  }

  async refreshAccessToken(
    microsoftRefreshToken: string,
  ): Promise<AuthTokens> {
    try {
      const refreshTokenRequest: RefreshTokenRequest = {
        refreshToken: microsoftRefreshToken,
        scopes: this.scopes,
      };

      const response = await this.cca.acquireTokenByRefreshToken(
        refreshTokenRequest,
      );

      if (!response) {
        throw new UnauthorizedException('Failed to refresh token - null response');
      }

      return {
        accessToken: response.accessToken,
        refreshToken: (response as any).refreshToken || microsoftRefreshToken,
        expiresIn: response.expiresOn
          ? Math.floor(
              (response.expiresOn.getTime() - Date.now()) / 1000,
            )
          : 3600,
      };
    } catch (error) {
      this.logger.error('Failed to refresh access token', error);
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  async handleAuthCallback(code: string) {
    try {
      const tokens = await this.exchangeCodeForTokens(code);
      const userProfile = await this.microsoftGraphService.getUserProfile(
        tokens.accessToken,
      );

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expiresIn);

      const user = await this.usersService.createOrUpdateUser({
        microsoftId: userProfile.id,
        email: userProfile.mail,
        displayName: userProfile.displayName,
        jobTitle: userProfile.jobTitle,
        avatar: undefined,
        microsoftAccessToken: tokens.accessToken,
        microsoftRefreshToken: tokens.refreshToken,
        tokenExpiresAt: expiresAt,
      });

      const appToken = this.jwtService.sign(
        {
          sub: (user as any)._id.toString(),
          email: user.email,
        },
        {
          expiresIn: '24h',
        },
      );

      return {
        user: {
          id: (user as any)._id.toString(),
          email: user.email,
          displayName: user.displayName,
        },
        appToken,
      };
    } catch (error) {
      this.logger.error('Auth callback failed', error);
      throw error;
    }
  }

  async getCurrentUserWithRefresh(userId: string, user: any) {
    const dbUser = await this.usersService.findById(userId);

    if (!dbUser) {
      throw new UnauthorizedException('User not found');
    }

    const now = new Date();
    if (dbUser.tokenExpiresAt < now) {
      try {
        const refreshToken = await this.usersService.getDecryptedRefreshToken(
          dbUser,
        );
        const tokens = await this.refreshAccessToken(refreshToken);

        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expiresIn);

        await this.usersService.updateTokens(
          userId,
          tokens.accessToken,
          tokens.refreshToken,
          expiresAt,
        );
      } catch (error) {
        this.logger.warn('Token refresh failed, proceeding with expired token', error);
      }
    }

    const userProfile = await this.usersService.getUserProfile(userId);
    return userProfile;
  }

  async logout(userId: string): Promise<void> {
    try {
      await this.usersService.updateTokens(
        userId,
        '',
        '',
        new Date(),
      );
      this.logger.log(`User ${userId} logged out`);
    } catch (error) {
      this.logger.error('Logout failed', error);
      throw error;
    }
  }
}
