import { IsOptional, IsString, IsBoolean, IsEmail } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  preferences?: {
    autoSummarize?: boolean;
    summaryLanguage?: string;
    emailNotifications?: boolean;
  };
}

export class UserPreferencesDto {
  @IsOptional()
  @IsBoolean()
  autoSummarize?: boolean;

  @IsOptional()
  @IsString()
  summaryLanguage?: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;
}
