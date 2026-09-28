import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';

import { BadRequestException } from '@nestjs/common';

import { ConfigService } from '@/core/config/config.service';
import {
  FileStorageService,
  StorageCategory,
} from '@/modules/storage/file-storage.service';

import { SecureUploadService } from './secure-upload.service';
import { UploadKind } from './upload-format';

// Deliberately exercises the REAL FileStorageService (real fs calls, several
// mkdir levels deep) rather than a mock. A prior bug here only manifested
// with real async timing: FileStorageService.save() awaits mkdir() before
// pipeline() attaches its error listener on the ContentGuardTransform, so a
// validation failure could fire before anything was listening and crash the
// process (EventEmitter throws on an unheard 'error'), instead of rejecting
// the promise. That exact race isn't reliably forced under Jest's runner —
// verified independently via a standalone script — but this still exercises
// the real filesystem path the bug lived in and guards the fixed behavior.
describe('SecureUploadService (integration, real filesystem)', () => {
  let baseDir: string;
  let service: SecureUploadService;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), 'secure-upload-it-'));
    const storageRoot = path.join(baseDir, 'a', 'b', 'c', 'd');
    const configService = {
      get: jest.fn((key: string) =>
        key === 'STORAGE_ROOT' ? storageRoot : '1048576',
      ),
    } as unknown as ConfigService;
    const fileStorageService = new FileStorageService(configService);
    service = new SecureUploadService(configService, fileStorageService);
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it('rejects unsafe SVG content without crashing the process', async () => {
    const stream = Readable.from([
      Buffer.from('<svg xmlns="x"><script>alert(1)</script></svg>'),
    ]);

    await expect(
      service.ingest({
        kind: UploadKind.IMAGE,
        filename: 'evil.svg',
        mimetype: 'image/svg+xml',
        stream,
        category: StorageCategory.TEMP,
        userId: 'user-1',
        jobId: 'job-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('still ingests a valid file end-to-end through the real filesystem', async () => {
    const stream = Readable.from(['{"a":1}']);

    const result = await service.ingest({
      kind: UploadKind.TEXT,
      filename: 'data.json',
      mimetype: 'application/json',
      stream,
      category: StorageCategory.TEMP,
      userId: 'user-1',
      jobId: 'job-2',
    });

    expect(result.sizeBytes).toBe(7);
    expect(result.path).toBe('temp/user-1/job-2.json');
  });
});
