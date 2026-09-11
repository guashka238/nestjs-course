import { NestFactory } from '@nestjs/core';
import {
  initializeTransactionalContext,
  StorageDriver,
} from 'typeorm-transactional';

import { AppModule } from '@/core/app/app.module';
import { Role } from '@/modules/users/entities/user.entity';
import { PermissionsService } from '@/modules/permissions/permissions.service';

// Baseline permissions for the admin role, covering the user-management
// features listed in TASK.md (view/update/delete/list users) plus managing
// permissions themselves. Exact names are a reasonable default pending the
// actual RBAC spec — [confirm against spec] — and no endpoint enforces them
// yet, since the users module has no controller.
const DEFAULT_ADMIN_PERMISSIONS = [
  { name: 'users:read', description: "View any user's profile" },
  { name: 'users:update', description: "Update any user's profile" },
  { name: 'users:delete', description: 'Delete a user account' },
  { name: 'users:list', description: 'List all user accounts' },
  {
    name: 'permissions:manage',
    description: 'Create, assign, and revoke permissions',
  },
];

async function seed() {
  initializeTransactionalContext({ storageDriver: StorageDriver.AUTO });
  // Nest's own Logger is suppressed (bootstrap noise); console.log below
  // is unaffected, so progress is still visible.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const permissionsService = app.get(PermissionsService);

    for (const dto of DEFAULT_ADMIN_PERMISSIONS) {
      const permission = await permissionsService.ensurePermission(dto);
      await permissionsService.assignPermissionToRole(
        Role.ADMIN,
        permission.id,
      );
      console.log(`Ensured "${dto.name}" is granted to admin`);
    }
  } finally {
    await app.close();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
