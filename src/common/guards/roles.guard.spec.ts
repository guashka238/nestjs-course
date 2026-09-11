import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Role } from '@/modules/users/entities/user.entity';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const createContext = (userRole: Role | undefined): ExecutionContext => {
    const request = {
      user: userRole ? { id: 'user-1', role: userRole } : undefined,
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  const mockMetadata = (options: { isPublic?: boolean; roles?: Role[] }) => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return options.isPublic ?? false;
      if (key === ROLES_KEY) return options.roles;
      return undefined;
    });
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows the request through when the route is marked @Public()', () => {
    mockMetadata({ isPublic: true, roles: [Role.ADMIN] });
    const context = createContext(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows the request through when the route has no @Roles() metadata', () => {
    mockMetadata({ roles: undefined });
    const context = createContext(Role.USER);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows the request through when the route has an empty @Roles() list', () => {
    mockMetadata({ roles: [] });
    const context = createContext(Role.USER);

    expect(guard.canActivate(context)).toBe(true);
  });

  it("throws ForbiddenException when the user's role is not in the required list", () => {
    mockMetadata({ roles: [Role.ADMIN] });
    const context = createContext(Role.USER);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when there is no user on the request at all', () => {
    mockMetadata({ roles: [Role.ADMIN] });
    const context = createContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("allows the request through when the user's role is in the required list", () => {
    mockMetadata({ roles: [Role.ADMIN] });
    const context = createContext(Role.ADMIN);

    expect(guard.canActivate(context)).toBe(true);
  });
});
