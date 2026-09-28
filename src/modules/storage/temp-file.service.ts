import { randomUUID } from 'node:crypto';
import { readdir, stat, rm } from 'node:fs/promises';
import * as path from 'node:path';
import type { Dirent } from 'node:fs';
import type { Readable } from 'node:stream';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { ConfigService } from '@/core/config/config.service';

import { FileStorageService, StorageCategory } from './file-storage.service';

@Injectable()
export class TempFileService implements OnModuleInit {
  private readonly logger = new Logger(TempFileService.name);

  constructor(
    private readonly fileStorageService: FileStorageService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const maxAgeMs = Number(this.configService.get('TEMP_FILE_MAX_AGE_MS'));

    try {
      const removed = await this.sweepStale(maxAgeMs);
      if (removed > 0) {
        this.logger.log(`Removed ${removed} stale temp file(s) on startup`);
      }
    } catch (error) {
      this.logger.warn(`Temp file sweep failed: ${(error as Error).message}`);
    }
  }

  // Writes `input` to a temp file, passes its absolute path to `fn`, and
  // guarantees the file is deleted afterward — whether `fn` succeeds, throws,
  // or the write itself fails.
  async withTempFile<T>(
    userId: string,
    ext: string,
    input: Readable,
    fn: (tempPath: string) => Promise<T>,
  ): Promise<T> {
    const jobId = randomUUID();
    const { path: relativePath } = await this.fileStorageService.save(
      StorageCategory.TEMP,
      userId,
      jobId,
      ext,
      input,
    );

    try {
      return await fn(this.fileStorageService.resolve(relativePath));
    } finally {
      await this.fileStorageService.delete(relativePath);
    }
  }

  // Defense in depth for temp files a crash left behind before their
  // `finally` cleanup ran. Returns the number of files removed.
  async sweepStale(maxAgeMs: number): Promise<number> {
    const tempRoot = this.fileStorageService.resolve(StorageCategory.TEMP);
    const files = await TempFileService.listFilesRecursively(tempRoot);

    const now = Date.now();
    let removed = 0;

    for (const filePath of files) {
      const stats = await stat(filePath);
      if (now - stats.mtimeMs > maxAgeMs) {
        await rm(filePath, { force: true });
        removed += 1;
      }
    }

    return removed;
  }

  private static async listFilesRecursively(dir: string): Promise<string[]> {
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await TempFileService.listFilesRecursively(fullPath)));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }

    return files;
  }
}
