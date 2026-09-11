import { createHash, randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { ConfigService } from '@/core/config/config.service';
import { User } from '@/modules/users/entities/user.entity';

export interface GeneratedRefreshToken {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.getAccessTokenTtlSeconds(),
      },
    );
  }

  generateRefreshToken(): GeneratedRefreshToken {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(
      Date.now() + this.getRefreshTokenTtlSeconds() * 1000,
    );

    return { rawToken, tokenHash, expiresAt };
  }

  getAccessTokenTtlSeconds(): number {
    return Number(this.configService.get('JWT_ACCESS_TTL'));
  }

  getRefreshTokenTtlSeconds(): number {
    return Number(this.configService.get('JWT_REFRESH_TTL'));
  }
}
