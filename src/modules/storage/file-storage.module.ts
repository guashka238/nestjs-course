import { Module } from '@nestjs/common';

import { FileStorageService } from './file-storage.service';
import { TempFileService } from './temp-file.service';

@Module({
  providers: [FileStorageService, TempFileService],
  exports: [FileStorageService, TempFileService],
})
export class FileStorageModule {}
