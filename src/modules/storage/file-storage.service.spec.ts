import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rm, stat } from 'node:fs/promises';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { PassThrough, Readable } from 'node:stream';

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ConfigService } from '@/core/config/config.service';

import { FileStorageService, StorageCategory } from './file-storage.service';

jest.mock('node:fs');
jest.mock('node:fs/promises');
jest.mock('node:stream/promises');

describe('FileStorageService', () => {
  let service: FileStorageService;
  const root = path.resolve(process.cwd(), 'storage');

  beforeEach(async () => {
    const configService = {
      get: jest.fn().mockReturnValue('./storage'),
    };

    (pipeline as jest.Mock).mockResolvedValue(undefined);
    (mkdir as jest.Mock).mockResolvedValue(undefined);
    (rm as jest.Mock).mockResolvedValue(undefined);
    (stat as jest.Mock).mockResolvedValue({ size: 1234 });
    (createWriteStream as jest.Mock).mockReturnValue(new PassThrough());
    (createReadStream as jest.Mock).mockReturnValue(new PassThrough());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileStorageService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('writes the stream under {category}/{userId}/{jobId}.{ext} and returns its size', async () => {
      const input = Readable.from(['data']);

      const result = await service.save(
        StorageCategory.UPLOADS,
        'user-1',
        'job-1',
        'txt',
        input,
      );

      expect(mkdir).toHaveBeenCalledWith(path.join(root, 'uploads', 'user-1'), {
        recursive: true,
      });
      expect(createWriteStream).toHaveBeenCalledWith(
        path.join(root, 'uploads', 'user-1', 'job-1.txt'),
      );
      expect(pipeline).toHaveBeenCalledWith(input, expect.anything());
      expect(result).toEqual({
        path: 'uploads/user-1/job-1.txt',
        sizeBytes: 1234,
      });
    });

    it('rejects a userId/jobId containing path separators', async () => {
      await expect(
        service.save(
          StorageCategory.UPLOADS,
          '../etc',
          'job-1',
          'txt',
          Readable.from(['data']),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(pipeline).not.toHaveBeenCalled();
    });

    it('rejects an unsafe file extension', async () => {
      await expect(
        service.save(
          StorageCategory.UPLOADS,
          'user-1',
          'job-1',
          '../../etc/passwd',
          Readable.from(['data']),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(pipeline).not.toHaveBeenCalled();
    });

    it('cleans up the partial file when the write fails', async () => {
      (pipeline as jest.Mock).mockRejectedValue(new Error('disk full'));

      await expect(
        service.save(
          StorageCategory.UPLOADS,
          'user-1',
          'job-1',
          'txt',
          Readable.from(['data']),
        ),
      ).rejects.toThrow('disk full');

      expect(rm).toHaveBeenCalledWith(
        path.join(root, 'uploads', 'user-1', 'job-1.txt'),
        { force: true },
      );
    });
  });

  describe('createReadStream', () => {
    it('reads from the resolved absolute path', () => {
      service.createReadStream('results/user-1/job-1.txt');

      expect(createReadStream).toHaveBeenCalledWith(
        path.join(root, 'results', 'user-1', 'job-1.txt'),
      );
    });

    it('rejects a path that escapes the storage root', () => {
      expect(() => service.createReadStream('../outside.txt')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('resolve', () => {
    it('returns the absolute path for a relative storage path', () => {
      expect(service.resolve('uploads/user-1/job-1.txt')).toBe(
        path.join(root, 'uploads', 'user-1', 'job-1.txt'),
      );
    });
  });

  describe('delete', () => {
    it('force-removes the resolved absolute path', async () => {
      await service.delete('uploads/user-1/job-1.txt');

      expect(rm).toHaveBeenCalledWith(
        path.join(root, 'uploads', 'user-1', 'job-1.txt'),
        { force: true },
      );
    });
  });

  describe('exists', () => {
    it('returns true when stat resolves', async () => {
      await expect(service.exists('uploads/user-1/job-1.txt')).resolves.toBe(
        true,
      );
    });

    it('returns false when stat rejects', async () => {
      (stat as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(service.exists('uploads/user-1/job-1.txt')).resolves.toBe(
        false,
      );
    });
  });

  describe('reservePath', () => {
    it('ensures the parent directory exists and returns the relative path', async () => {
      const relativePath = await service.reservePath(
        StorageCategory.RESULTS,
        'user-1',
        'job-1',
        'json',
      );

      expect(mkdir).toHaveBeenCalledWith(path.join(root, 'results', 'user-1'), {
        recursive: true,
      });
      expect(relativePath).toBe('results/user-1/job-1.json');
    });

    it('rejects an unsafe file extension', async () => {
      await expect(
        service.reservePath(StorageCategory.RESULTS, 'user-1', 'job-1', '../x'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mkdir).not.toHaveBeenCalled();
    });
  });

  describe('size', () => {
    it('returns the size of the resolved path', async () => {
      await expect(service.size('uploads/user-1/job-1.txt')).resolves.toBe(
        1234,
      );
      expect(stat).toHaveBeenCalledWith(
        path.join(root, 'uploads', 'user-1', 'job-1.txt'),
      );
    });
  });
});
