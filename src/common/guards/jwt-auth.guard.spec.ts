import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { ConfigService } from '@/core/config/config.service';
import { Role } from '@/modules/users/entities/user.entity';

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let jwtService: { verifyAsync: jest.Mock };
  let configService: { get: jest.Mock };

  const createContext = (
    cookies: Record<string, string | undefined>,
  ): ExecutionContext => {
    const request = { cookies, user: undefined as unknown };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    jwtService = { verifyAsync: jest.fn() };
    configService = { get: jest.fn().mockReturnValue('access-secret') };

    guard = new JwtAuthGuard(
      reflector as unknown as Reflector,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('allows the request through when the route is marked @Public()', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createContext({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when no access_token cookie is present', async () => {
    const context = createContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the token fails verification', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    const context = createContext({ access_token: 'bad-token' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the decoded user to the request and allows the request through on a valid token', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      role: Role.ADMIN,
    });
    const request = {
      cookies: { access_token: 'good-token' },
      user: undefined as unknown,
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('good-token', {
      secret: 'access-secret',
    });
    expect(request.user).toEqual({ id: 'user-1', role: Role.ADMIN });
  });
});
