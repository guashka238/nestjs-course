import * as path from 'node:path';
import type { Readable } from 'node:stream';

import {
  BadRequestException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

import { ConfigService } from '@/core/config/config.service';
import type {
  SaveFileResult,
  StorageCategory,
} from '@/modules/storage/file-storage.service';
import { FileStorageService } from '@/modules/storage/file-storage.service';

import { ContentGuardTransform } from './content-guard.transform';
import {
  ALLOWED_MIME_TYPES,
  EXTENSION_TO_FORMAT,
  FORBIDDEN_PATTERNS,
  FORMAT_CONFIG_KEY,
  FORMAT_KIND,
  MAGIC_BYTES,
  SourceFormat,
  UploadKind,
} from './upload-format';

export interface IngestUploadParams {
  kind: UploadKind;
  filename: string;
  mimetype: string;
  stream: Readable;
  category: StorageCategory;
  userId: string;
  jobId: string;
}

export interface IngestUploadResult extends SaveFileResult {
  format: SourceFormat;
}

@Injectable()
export class SecureUploadService {
  constructor(
    private readonly configService: ConfigService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async ingest(params: IngestUploadParams): Promise<IngestUploadResult> {
    const format = SecureUploadService.resolveFormat(
      params.kind,
      params.filename,
      params.mimetype,
    );
    const maxBytes = this.getMaxBytes(format);

    const guard = new ContentGuardTransform({
      maxBytes,
      magicBytes: MAGIC_BYTES[format],
      forbiddenPatterns: FORBIDDEN_PATTERNS[format],
    });
    // .pipe() alone won't forward a source-stream error to `guard` (a Node
    // stream quirk); forward it explicitly so pipeline() inside save() sees it.
    params.stream.on('error', (error) => guard.destroy(error));
    // .pipe() starts pumping data into `guard` immediately, but save() below
    // awaits mkdir() before it calls pipeline() (the thing that actually
    // listens for `guard`'s errors) — a validation failure can fire before
    // that listener exists, and an EventEmitter throws on an unheard 'error'.
    // This no-op keeps the process alive; pipeline() still attaches its own
    // listener and rejects correctly even if `guard` already errored.
    guard.on('error', () => {});
    const guarded = params.stream.pipe(guard);

    const saved = await this.fileStorageService.save(
      params.category,
      params.userId,
      params.jobId,
      format,
      guarded,
    );

    if (saved.sizeBytes === 0) {
      await this.fileStorageService.delete(saved.path);
      throw new BadRequestException('Uploaded file must not be empty');
    }

    return { ...saved, format };
  }

  private static resolveFormat(
    kind: UploadKind,
    filename: string,
    mimetype: string,
  ): SourceFormat {
    const extension = path.extname(filename).slice(1).toLowerCase();
    const format = EXTENSION_TO_FORMAT[extension];

    if (!format || FORMAT_KIND[format] !== kind) {
      throw new UnsupportedMediaTypeException(
        'Unsupported or missing file format',
      );
    }

    if (!ALLOWED_MIME_TYPES[format].includes(mimetype)) {
      throw new UnsupportedMediaTypeException(
        'Declared content type does not match the file format',
      );
    }

    return format;
  }

  private getMaxBytes(format: SourceFormat): number {
    return Number(this.configService.get(FORMAT_CONFIG_KEY[format]));
  }
}
