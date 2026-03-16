import { IsString, IsEmail } from 'class-validator';

export class AuthResponseDto {
  @IsString()
  appToken: string;

  @IsString()
  id: string;

  @IsEmail()
  email: string;

  @IsString()
  displayName: string;
}

export class AuthUrlResponseDto {
  @IsString()
  url: string;
}

export class RefreshTokenRequestDto {
  @IsString()
  refreshToken: string;
}
