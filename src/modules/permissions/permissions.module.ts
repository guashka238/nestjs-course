import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsRepository } from './repositories/permissions.repository';
import { PermissionsService } from './permissions.service';
import { RolePermissionsRepository } from './repositories/role-permissions.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, RolePermission])],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    PermissionsRepository,
    RolePermissionsRepository,
  ],
  // PermissionsService is consumed by PermissionsGuard, registered in CommonModule.
  exports: [PermissionsService],
})
export class PermissionsModule {}
