import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import type { Readable } from 'node:stream';

import { HttpException, Injectable } from '@nestjs/common';

import { ConfigService } from '@/core/config/config.service';
import {
  FileStorageService,
  StorageCategory,
} from '@/modules/storage/file-storage.service';
import { SecureUploadService } from '@/modules/uploads/secure-upload.service';
import { SourceFormat, UploadKind } from '@/modules/uploads/upload-format';

import { assertSupportedConversion } from './conversion-pairs';
import {
  Transformation,
  TransformationStatus,
  TransformationType,
} from './entities/transformation.entity';
import { TransformationsRepository } from './repositories/transformations.repository';
import type { TransformationOptions } from './strategies/transformation-strategy';
import { TransformationStrategyRegistry } from './strategies/transformation-strategy.registry';

const UPLOAD_KIND_TO_TRANSFORMATION_TYPE: Record<
  UploadKind,
  TransformationType
> = {
  [UploadKind.TEXT]: TransformationType.FILE,
  [UploadKind.IMAGE]: TransformationType.IMAGE,
};

export interface RunTransformationParams {
  userId: string;
  kind: UploadKind;
  filename: string;
  mimetype: string;
  stream: Readable;
  targetFormat: SourceFormat;
  save: boolean;
  options?: TransformationOptions;
}

export interface TransformationOutcome {
  history: Transformation;
  // Absolute path — caller streams this to the HTTP response.
  resultPath: string;
  // For Content-Disposition; derived from the source filename.
  resultFileName: string;
  // Caller must invoke this once the response stream has finished, so a
  // non-saved result's temp file is removed after it's been delivered.
  cleanup: () => Promise<void>;
}

@Injectable()
export class TransformationOrchestrationService {
  constructor(
    private readonly secureUploadService: SecureUploadService,
    private readonly fileStorageService: FileStorageService,
    private readonly strategyRegistry: TransformationStrategyRegistry,
    private readonly transformationsRepository: TransformationsRepository,
    private readonly configService: ConfigService,
  ) {}

  async run(params: RunTransformationParams): Promise<TransformationOutcome> {
    const jobId = randomUUID();
    const startedAt = Date.now();

    const ingested = await this.secureUploadService.ingest({
      kind: params.kind,
      filename: params.filename,
      mimetype: params.mimetype,
      stream: params.stream,
      category: StorageCategory.TEMP,
      userId: params.userId,
      jobId,
    });

    let outputRelativePath: string | undefined;

    try {
      assertSupportedConversion(ingested.format, params.targetFormat);

      const strategy = this.strategyRegistry.resolve(
        ingested.format,
        params.targetFormat,
      );

      const resultCategory = params.save
        ? StorageCategory.RESULTS
        : StorageCategory.TEMP;
      outputRelativePath = await this.fileStorageService.reservePath(
        resultCategory,
        params.userId,
        jobId,
        params.targetFormat,
      );

      await strategy.transform(
        this.fileStorageService.resolve(ingested.path),
        this.fileStorageService.resolve(outputRelativePath),
        params.options,
      );

      const resultSizeBytes =
        await this.fileStorageService.size(outputRelativePath);
      const durationMs = Date.now() - startedAt;
      const expiresAt = params.save
        ? new Date(
            Date.now() + Number(this.configService.get('HISTORY_RETENTION_MS')),
          )
        : null;

      const history = await this.transformationsRepository.create({
        userId: params.userId,
        type: UPLOAD_KIND_TO_TRANSFORMATION_TYPE[params.kind],
        sourceFormat: ingested.format,
        targetFormat: params.targetFormat,
        status: TransformationStatus.SUCCESS,
        sourceFileName: params.filename,
        fileSize: ingested.sizeBytes,
        durationMs,
        errorCode: null,
        resultFileId: params.save ? outputRelativePath : null,
        resultSizeBytes: params.save ? resultSizeBytes : null,
        expiresAt,
      });

      return {
        history,
        resultPath: this.fileStorageService.resolve(outputRelativePath),
        resultFileName: TransformationOrchestrationService.buildResultFileName(
          params.filename,
          params.targetFormat,
        ),
        cleanup: async () => {
          if (!params.save) {
            await this.fileStorageService.delete(outputRelativePath!);
          }
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      await this.transformationsRepository.create({
        userId: params.userId,
        type: UPLOAD_KIND_TO_TRANSFORMATION_TYPE[params.kind],
        sourceFormat: ingested.format,
        targetFormat: params.targetFormat,
        status: TransformationStatus.ERROR,
        sourceFileName: params.filename,
        fileSize: ingested.sizeBytes,
        durationMs,
        errorCode: TransformationOrchestrationService.errorCodeFor(error),
        resultFileId: null,
        resultSizeBytes: null,
        expiresAt: null,
      });

      if (outputRelativePath) {
        await this.fileStorageService.delete(outputRelativePath);
      }

      throw error;
    } finally {
      // The source upload is always scratch space — only a saved *result*
      // may outlive this call.
      await this.fileStorageService.delete(ingested.path);
    }
  }

  private static buildResultFileName(
    sourceFileName: string,
    targetFormat: SourceFormat,
  ): string {
    const base = path.basename(sourceFileName, path.extname(sourceFileName));
    return `${base}.${targetFormat}`;
  }

  private static errorCodeFor(error: unknown): string {
    if (error instanceof HttpException) {
      return error.constructor.name;
    }
    return 'INTERNAL_ERROR';
  }
}
