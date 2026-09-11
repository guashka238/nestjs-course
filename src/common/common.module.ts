import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { PermissionsModule } from '@/modules/permissions/permissions.module';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [JwtModule.register({}), PermissionsModule],
  providers: [
    // Order matters: JwtAuthGuard must run first to populate request.user,
    // then RolesGuard, then PermissionsGuard (both depend on request.user).
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class CommonModule {}
