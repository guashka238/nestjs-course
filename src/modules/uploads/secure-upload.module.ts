import { Module } from '@nestjs/common';

import { FileStorageModule } from '@/modules/storage/file-storage.module';

import { SecureUploadService } from './secure-upload.service';

@Module({
  imports: [FileStorageModule],
  providers: [SecureUploadService],
  exports: [SecureUploadService],
})
export class SecureUploadModule {}
