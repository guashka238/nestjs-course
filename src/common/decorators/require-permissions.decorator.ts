import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSIONS_KEY = 'requiredPermissions';

// Restricts a route/controller to roles that have ALL of the given
// permissions (AND semantics), looked up dynamically from the DB by
// PermissionsGuard. No decorator on a route means no permission check —
// RolesGuard's role check (if any) still applies independently.
export const RequirePermissions = (...names: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, names);
