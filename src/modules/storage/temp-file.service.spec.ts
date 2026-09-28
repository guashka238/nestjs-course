import { readdir, rm, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';

import { Test, TestingModule } from '@nestjs/testing';

import { ConfigService } from '@/core/config/config.service';

import { FileStorageService, StorageCategory } from './file-storage.service';
import { TempFileService } from './temp-file.service';

jest.mock('node:fs/promises');

describe('TempFileService', () => {
  let service: TempFileService;
  let fileStorageService: {
    save: jest.Mock;
    resolve: jest.Mock;
    delete: jest.Mock;
  };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    fileStorageService = {
      save: jest
        .fn()
        .mockResolvedValue({ path: 'temp/user-1/job-1.json', sizeBytes: 2 }),
      resolve: jest.fn((relativePath: string) => `/storage/${relativePath}`),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    configService = { get: jest.fn().mockReturnValue('86400000') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TempFileService,
        { provide: FileStorageService, useValue: fileStorageService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<TempFileService>(TempFileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('withTempFile', () => {
    it('saves the input under the TEMP category and passes the resolved path to fn', async () => {
      const fn = jest.fn().mockResolvedValue('result');

      const result = await service.withTempFile(
        'user-1',
        'json',
        Readable.from(['{}']),
        fn,
      );

      expect(fileStorageService.save).toHaveBeenCalledWith(
        StorageCategory.TEMP,
        'user-1',
        expect.any(String),
        'json',
        expect.anything(),
      );
      expect(fn).toHaveBeenCalledWith('/storage/temp/user-1/job-1.json');
      expect(result).toBe('result');
    });

    it('deletes the temp file after fn resolves', async () => {
      await service.withTempFile(
        'user-1',
        'json',
        Readable.from(['{}']),
        jest.fn().mockResolvedValue(undefined),
      );

      expect(fileStorageService.delete).toHaveBeenCalledWith(
        'temp/user-1/job-1.json',
      );
    });

    it('deletes the temp file even when fn throws, and propagates the error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('processing failed'));

      await expect(
        service.withTempFile('user-1', 'json', Readable.from(['{}']), fn),
      ).rejects.toThrow('processing failed');
      expect(fileStorageService.delete).toHaveBeenCalledWith(
        'temp/user-1/job-1.json',
      );
    });
  });

  describe('sweepStale', () => {
    it('removes only files older than maxAgeMs', async () => {
      (readdir as jest.Mock).mockImplementation((dir: string) => {
        if (dir === '/storage/temp') {
          return Promise.resolve([
            { name: 'old.json', isDirectory: () => false, isFile: () => true },
            { name: 'new.json', isDirectory: () => false, isFile: () => true },
          ]);
        }
        return Promise.resolve([]);
      });
      (stat as jest.Mock).mockImplementation((filePath: string) =>
        Promise.resolve({
          mtimeMs: filePath.endsWith('old.json')
            ? Date.now() - 100_000
            : Date.now(),
        }),
      );

      const removed = await service.sweepStale(50_000);

      expect(rm).toHaveBeenCalledTimes(1);
      expect(rm).toHaveBeenCalledWith(expect.stringContaining('old.json'), {
        force: true,
      });
      expect(removed).toBe(1);
    });

    it('recurses into subdirectories', async () => {
      (readdir as jest.Mock).mockImplementation((dir: string) => {
        if (dir === '/storage/temp') {
          return Promise.resolve([
            { name: 'user-1', isDirectory: () => true, isFile: () => false },
          ]);
        }
        if (dir.endsWith('user-1')) {
          return Promise.resolve([
            { name: 'job.json', isDirectory: () => false, isFile: () => true },
          ]);
        }
        return Promise.resolve([]);
      });
      (stat as jest.Mock).mockResolvedValue({ mtimeMs: Date.now() - 100_000 });

      const removed = await service.sweepStale(50_000);

      expect(removed).toBe(1);
    });

    it('returns 0 when the temp directory does not exist yet', async () => {
      (readdir as jest.Mock).mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
      );

      await expect(service.sweepStale(50_000)).resolves.toBe(0);
      expect(rm).not.toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    it('sweeps using the configured max age', async () => {
      (readdir as jest.Mock).mockResolvedValue([]);

      await service.onModuleInit();

      expect(configService.get).toHaveBeenCalledWith('TEMP_FILE_MAX_AGE_MS');
    });

    it('swallows sweep failures without throwing', async () => {
      (readdir as jest.Mock).mockRejectedValue(new Error('disk error'));

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });
});
