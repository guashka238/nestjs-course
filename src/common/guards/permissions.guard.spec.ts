import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Role } from '@/modules/users/entities/user.entity';
import { PermissionsService } from '@/modules/permissions/permissions.service';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let permissionsService: { getPermissionNamesForRole: jest.Mock };

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

  const mockMetadata = (options: {
    isPublic?: boolean;
    permissions?: string[];
  }) => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return options.isPublic ?? false;
      if (key === REQUIRE_PERMISSIONS_KEY) return options.permissions;
      return undefined;
    });
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    permissionsService = { getPermissionNamesForRole: jest.fn() };
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      permissionsService as unknown as PermissionsService,
    );
  });

  it('allows the request through when the route is marked @Public()', async () => {
    mockMetadata({ isPublic: true, permissions: ['users:read'] });
    const context = createContext(undefined);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(permissionsService.getPermissionNamesForRole).not.toHaveBeenCalled();
  });

  it('allows the request through when the route has no @RequirePermissions() metadata', async () => {
    mockMetadata({ permissions: undefined });
    const context = createContext(Role.USER);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(permissionsService.getPermissionNamesForRole).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when there is no user on the request at all', async () => {
    mockMetadata({ permissions: ['users:read'] });
    const context = createContext(undefined);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("throws ForbiddenException when the role's permissions do not include all required ones", async () => {
    mockMetadata({ permissions: ['users:read', 'users:delete'] });
    permissionsService.getPermissionNamesForRole.mockResolvedValue([
      'users:read',
    ]);
    const context = createContext(Role.ADMIN);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("allows the request through when the role's permissions include all required ones", async () => {
    mockMetadata({ permissions: ['users:read'] });
    permissionsService.getPermissionNamesForRole.mockResolvedValue([
      'users:read',
      'users:delete',
    ]);
    const context = createContext(Role.ADMIN);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
