import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { ConfigModule } from '@/core/config/config.module';
import { DatabaseModule } from '@/core/database/database.module';
import { HealthModule } from '@/core/health/health.module';
import { ThrottlerModule } from '@/core/throttler/throttler.module';

/**
 *
 * Application modules
 *
 */
import { AuthModule } from '@/modules/auth/auth.module';
import { PermissionsModule } from '@/modules/permissions/permissions.module';
import { FileStorageModule } from '@/modules/storage/file-storage.module';
import { TransformationsModule } from '@/modules/transformations/transformations.module';
import { SecureUploadModule } from '@/modules/uploads/secure-upload.module';
import { UsersModule } from '@/modules/users/users.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    HealthModule,
    ThrottlerModule,
    CommonModule,
    /**
     *
     * Application modules
     *
     */
    UsersModule,
    AuthModule,
    PermissionsModule,
    FileStorageModule,
    SecureUploadModule,
    TransformationsModule,
  ],
})
export class AppModule {}
