import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({ required: true, unique: true })
  microsoftId: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ nullable: true })
  jobTitle?: string;

  @Prop({ nullable: true })
  avatar?: string;

  @Prop({ required: true })
  microsoftAccessToken: string;

  @Prop({ required: true })
  microsoftRefreshToken: string;

  @Prop({ required: true })
  tokenExpiresAt: Date;

  @Prop({ nullable: true })
  lastLoginAt?: Date;

  @Prop({
    type: {
      autoSummarize: { type: Boolean, default: true },
      summaryLanguage: { type: String, default: 'en' },
      emailNotifications: { type: Boolean, default: true },
    },
    default: {
      autoSummarize: true,
      summaryLanguage: 'en',
      emailNotifications: true,
    },
  })
  preferences: {
    autoSummarize: boolean;
    summaryLanguage: string;
    emailNotifications: boolean;
  };

  @Prop({ default: () => new Date() })
  createdAt: Date;

  @Prop({ default: () => new Date() })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 });
UserSchema.index({ microsoftId: 1 });
UserSchema.index({ createdAt: -1 });
