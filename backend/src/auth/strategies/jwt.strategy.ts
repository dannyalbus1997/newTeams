import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@/config/configuration';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService<AppConfig>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Fallback: extract token from ?token= query param (for streaming endpoints
        // where the client cannot set Authorization headers, e.g. <video src="...">)
        (req: Request) => req?.query?.token as string || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret', { infer: true }),
    });
  }

  async validate(payload: any) {
    return {
      sub: payload.sub,
      email: payload.email,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
