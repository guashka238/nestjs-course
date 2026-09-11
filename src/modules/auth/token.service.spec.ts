import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';

import { ConfigService } from '@/core/config/config.service';
import { Role, User } from '@/modules/users/entities/user.entity';

import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: { signAsync: jest.Mock };
  let configService: { get: jest.Mock };

  const user: User = {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hashed',
    role: Role.USER,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed-jwt') };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_ACCESS_TTL: '900',
          JWT_REFRESH_TTL: '604800',
        };
        return values[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  describe('signAccessToken', () => {
    it('signs a JWT with the user id and role, using the configured secret and TTL', async () => {
      const token = await service.signAccessToken(user);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: user.id, role: user.role },
        { secret: 'access-secret', expiresIn: 900 },
      );
      expect(token).toBe('signed-jwt');
    });
  });

  describe('generateRefreshToken', () => {
    it('generates a raw token, its sha256 hash, and an expiry from the configured TTL', () => {
      const before = Date.now();
      const result = service.generateRefreshToken();
      const after = Date.now();

      expect(result.rawToken).toMatch(/^[a-f0-9]{64}$/);
      expect(result.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.tokenHash).not.toBe(result.rawToken);
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
        before + 604800 * 1000,
      );
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(
        after + 604800 * 1000,
      );
    });
  });

  describe('getAccessTokenTtlSeconds / getRefreshTokenTtlSeconds', () => {
    it('coerces the configured TTLs to numbers', () => {
      expect(service.getAccessTokenTtlSeconds()).toBe(900);
      expect(service.getRefreshTokenTtlSeconds()).toBe(604800);
    });
  });
});
