import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Redirect,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthResponseDto, AuthUrlResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '@/common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('login')
  @ApiOperation({ summary: 'Initiate Microsoft OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Microsoft login',
  })
  async login(@Res() res: Response) {
    const { url } = await this.authService.getAuthenticationUrl();
    return res.redirect(url);
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle OAuth callback from Microsoft' })
  @ApiQuery({ name: 'code', description: 'Authorization code from Microsoft' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to frontend with token',
  })
  async callback(@Query('code') code: string, @Res() res: Response) {
    try {
      const result = await this.authService.handleAuthCallback(code);
      const frontendUrl = this.configService.get('frontendUrl') || 'http://localhost:3000';
      const userParam = encodeURIComponent(JSON.stringify(result.user));
      return res.redirect(`${frontendUrl}/login?token=${result.appToken}&user=${userParam}`);
    } catch (error) {
      const frontendUrl = this.configService.get('frontendUrl') || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
  })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getCurrentUserWithRefresh(user.sub, user);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logout(user.sub);
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check for auth service' })
  @ApiResponse({ status: 200, description: 'Auth service is healthy' })
  async health() {
    return { status: 'ok', service: 'auth' };
  }
}
