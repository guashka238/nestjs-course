import { SetMetadata } from '@nestjs/common';

import { Role } from '@/modules/users/entities/user.entity';

export const ROLES_KEY = 'roles';

// Restricts a route/controller to the given roles. No decorator on a route
// means "any authenticated user" — RolesGuard only checks routes that have it.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
