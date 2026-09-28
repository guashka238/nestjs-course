import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rm, stat } from 'node:fs/promises';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '@/core/config/config.service';

export enum StorageCategory {
  UPLOADS = 'uploads',
  RESULTS = 'results',
  // Scratch space for a file that only needs to exist for the duration of a
  // single operation (e.g. the source upload while it's being transformed).
  // Use TempFileService rather than writing directly under this category.
  TEMP = 'temp',
}

export interface SaveFileResult {
  // Relative to the storage root, POSIX-style (e.g. "uploads/{userId}/{jobId}.ext")
  // — safe to persist in the database and independent of where the root lives on disk.
  path: string;
  sizeBytes: number;
}

// UUIDs in practice (userId, jobId), but validated generically as path segments.
const SEGMENT_PATTERN = /^[a-zA-Z0-9_-]+$/;
const EXTENSION_PATTERN = /^[a-zA-Z0-9]{1,10}$/;

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly root: string;

  constructor(private readonly configService: ConfigService) {
    this.root = path.resolve(
      process.cwd(),
      this.configService.get('STORAGE_ROOT'),
    );
  }

  async save(
    category: StorageCategory,
    userId: string,
    jobId: string,
    ext: string,
    input: Readable,
  ): Promise<SaveFileResult> {
    const relativePath = FileStorageService.buildRelativePath(
      category,
      userId,
      jobId,
      ext,
    );
    const absolutePath = this.resolveSafePath(relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });

    try {
      await pipeline(input, createWriteStream(absolutePath));
    } catch (error) {
      await rm(absolutePath, { force: true });
      throw error;
    }

    const { size } = await stat(absolutePath);
    this.logger.log(`Saved ${size} bytes to ${relativePath}`);

    return { path: relativePath, sizeBytes: size };
  }

  createReadStream(relativePath: string): Readable {
    return createReadStream(this.resolveSafePath(relativePath));
  }

  resolve(relativePath: string): string {
    return this.resolveSafePath(relativePath);
  }

  async delete(relativePath: string): Promise<void> {
    await rm(this.resolveSafePath(relativePath), { force: true });
  }

  // Reserves a location for a caller that writes the file itself (e.g. a
  // transformation strategy encoding directly to disk) rather than piping a
  // Readable through save(). Ensures the parent directory exists; the file
  // itself is not created.
  async reservePath(
    category: StorageCategory,
    userId: string,
    jobId: string,
    ext: string,
  ): Promise<string> {
    const relativePath = FileStorageService.buildRelativePath(
      category,
      userId,
      jobId,
      ext,
    );
    const absolutePath = this.resolveSafePath(relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });

    return relativePath;
  }

  async size(relativePath: string): Promise<number> {
    const { size } = await stat(this.resolveSafePath(relativePath));
    return size;
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await stat(this.resolveSafePath(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  private static buildRelativePath(
    category: StorageCategory,
    userId: string,
    jobId: string,
    ext: string,
  ): string {
    if (!SEGMENT_PATTERN.test(userId) || !SEGMENT_PATTERN.test(jobId)) {
      throw new BadRequestException('Invalid storage path segment');
    }
    if (!EXTENSION_PATTERN.test(ext)) {
      throw new BadRequestException('Invalid file extension');
    }

    return `${category}/${userId}/${jobId}.${ext}`;
  }

  // Defense in depth against path traversal: even though callers are expected
  // to pass validated segments/DB-stored paths, never write/read outside root.
  private resolveSafePath(relativePath: string): string {
    const absolutePath = path.resolve(this.root, relativePath);

    if (
      absolutePath !== this.root &&
      !absolutePath.startsWith(this.root + path.sep)
    ) {
      throw new BadRequestException('Resolved path escapes the storage root');
    }

    return absolutePath;
  }
}
