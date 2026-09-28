import {
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'node:stream';

import { ConfigService } from '@/core/config/config.service';
import { StorageCategory } from '@/modules/storage/file-storage.service';
import { FileStorageService } from '@/modules/storage/file-storage.service';

import { SecureUploadService } from './secure-upload.service';
import { PNG_MAGIC_BYTES, UploadKind } from './upload-format';

describe('SecureUploadService', () => {
  let service: SecureUploadService;
  let fileStorageService: { save: jest.Mock; delete: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    fileStorageService = {
      save: jest
        .fn()
        .mockResolvedValue({ path: 'uploads/u/j.json', sizeBytes: 4 }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    configService = {
      get: jest.fn().mockReturnValue('1048576'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecureUploadService,
        { provide: FileStorageService, useValue: fileStorageService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<SecureUploadService>(SecureUploadService);
  });

  describe('ingest', () => {
    it('resolves the format from the extension and delegates to FileStorageService', async () => {
      const stream = Readable.from(['{}']);

      const result = await service.ingest({
        kind: UploadKind.TEXT,
        filename: 'data.json',
        mimetype: 'application/json',
        stream,
        category: StorageCategory.UPLOADS,
        userId: 'user-1',
        jobId: 'job-1',
      });

      expect(fileStorageService.save).toHaveBeenCalledWith(
        StorageCategory.UPLOADS,
        'user-1',
        'job-1',
        'json',
        expect.anything(),
      );
      expect(result).toEqual({
        path: 'uploads/u/j.json',
        sizeBytes: 4,
        format: 'json',
      });
    });

    it('rejects an extension outside the requested kind', async () => {
      await expect(
        service.ingest({
          kind: UploadKind.IMAGE,
          filename: 'data.json',
          mimetype: 'application/json',
          stream: Readable.from(['{}']),
          category: StorageCategory.UPLOADS,
          userId: 'user-1',
          jobId: 'job-1',
        }),
      ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
      expect(fileStorageService.save).not.toHaveBeenCalled();
    });

    it('rejects an unknown extension', async () => {
      await expect(
        service.ingest({
          kind: UploadKind.TEXT,
          filename: 'data.exe',
          mimetype: 'application/octet-stream',
          stream: Readable.from(['data']),
          category: StorageCategory.UPLOADS,
          userId: 'user-1',
          jobId: 'job-1',
        }),
      ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
      expect(fileStorageService.save).not.toHaveBeenCalled();
    });

    it('rejects a mimetype that does not match the extension', async () => {
      await expect(
        service.ingest({
          kind: UploadKind.TEXT,
          filename: 'data.json',
          mimetype: 'image/png',
          stream: Readable.from(['{}']),
          category: StorageCategory.UPLOADS,
          userId: 'user-1',
          jobId: 'job-1',
        }),
      ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
      expect(fileStorageService.save).not.toHaveBeenCalled();
    });

    it('reads the max size for the resolved format from config', async () => {
      await service.ingest({
        kind: UploadKind.IMAGE,
        filename: 'photo.png',
        mimetype: 'image/png',
        stream: Readable.from([PNG_MAGIC_BYTES]),
        category: StorageCategory.UPLOADS,
        userId: 'user-1',
        jobId: 'job-1',
      });

      expect(configService.get).toHaveBeenCalledWith(
        'UPLOAD_MAX_SIZE_PNG_BYTES',
      );
    });

    it('rejects and cleans up an empty saved file', async () => {
      fileStorageService.save.mockResolvedValue({
        path: 'uploads/u/j.json',
        sizeBytes: 0,
      });

      await expect(
        service.ingest({
          kind: UploadKind.TEXT,
          filename: 'data.json',
          mimetype: 'application/json',
          stream: Readable.from(['']),
          category: StorageCategory.UPLOADS,
          userId: 'user-1',
          jobId: 'job-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fileStorageService.delete).toHaveBeenCalledWith(
        'uploads/u/j.json',
      );
    });
  });
});
