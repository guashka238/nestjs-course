import { BadRequestException, NotImplementedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'node:stream';

import { ConfigService } from '@/core/config/config.service';
import { FileStorageService } from '@/modules/storage/file-storage.service';
import { SecureUploadService } from '@/modules/uploads/secure-upload.service';
import { SourceFormat, UploadKind } from '@/modules/uploads/upload-format';

import { TransformationStatus } from './entities/transformation.entity';
import { TransformationsRepository } from './repositories/transformations.repository';
import { TransformationStrategyRegistry } from './strategies/transformation-strategy.registry';
import { TransformationOrchestrationService } from './transformation-orchestration.service';

describe('TransformationOrchestrationService', () => {
  let service: TransformationOrchestrationService;
  let secureUploadService: { ingest: jest.Mock };
  let fileStorageService: {
    resolve: jest.Mock;
    reservePath: jest.Mock;
    size: jest.Mock;
    delete: jest.Mock;
  };
  let strategyRegistry: { resolve: jest.Mock };
  let transformationsRepository: { create: jest.Mock };
  let configService: { get: jest.Mock };

  const baseParams = {
    userId: 'user-1',
    kind: UploadKind.TEXT,
    filename: 'report.csv',
    mimetype: 'text/csv',
    stream: Readable.from(['a,b\n1,2']),
    targetFormat: SourceFormat.JSON,
    save: false,
  };

  beforeEach(async () => {
    secureUploadService = {
      ingest: jest.fn().mockResolvedValue({
        format: SourceFormat.CSV,
        path: 'temp/user-1/job-1.csv',
        sizeBytes: 8,
      }),
    };
    fileStorageService = {
      resolve: jest.fn((relativePath: string) => `/storage/${relativePath}`),
      reservePath: jest.fn().mockResolvedValue('temp/user-1/job-1.json'),
      size: jest.fn().mockResolvedValue(20),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    strategyRegistry = {
      resolve: jest.fn().mockReturnValue({
        transform: jest.fn().mockResolvedValue(undefined),
      }),
    };
    transformationsRepository = {
      create: jest
        .fn()
        .mockImplementation((data) => Promise.resolve({ id: 'tx-1', ...data })),
    };
    configService = { get: jest.fn().mockReturnValue('7776000000') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransformationOrchestrationService,
        { provide: SecureUploadService, useValue: secureUploadService },
        { provide: FileStorageService, useValue: fileStorageService },
        { provide: TransformationStrategyRegistry, useValue: strategyRegistry },
        {
          provide: TransformationsRepository,
          useValue: transformationsRepository,
        },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<TransformationOrchestrationService>(
      TransformationOrchestrationService,
    );
  });

  it('runs a save=false conversion, records success history, and deletes both temp files on cleanup', async () => {
    const outcome = await service.run(baseParams);

    expect(fileStorageService.reservePath).toHaveBeenCalledWith(
      'temp',
      'user-1',
      expect.any(String),
      'json',
    );
    expect(transformationsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TransformationStatus.SUCCESS,
        sourceFormat: SourceFormat.CSV,
        targetFormat: SourceFormat.JSON,
        resultFileId: null,
        resultSizeBytes: null,
        expiresAt: null,
      }),
    );
    expect(outcome.resultFileName).toBe('report.json');
    expect(outcome.resultPath).toBe('/storage/temp/user-1/job-1.json');

    await outcome.cleanup();
    expect(fileStorageService.delete).toHaveBeenCalledWith(
      'temp/user-1/job-1.json',
    );
    // Always removes the source upload regardless of save.
    expect(fileStorageService.delete).toHaveBeenCalledWith(
      'temp/user-1/job-1.csv',
    );
  });

  it('forwards options through to the resolved strategy', async () => {
    const transform = jest.fn().mockResolvedValue(undefined);
    strategyRegistry.resolve.mockReturnValue({ transform });
    const options = { quality: 80 };

    await service.run({ ...baseParams, options });

    expect(transform).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      options,
    );
  });

  it('runs a save=true conversion, persists the result under RESULTS with an expiry, and does not delete it on cleanup', async () => {
    fileStorageService.reservePath.mockResolvedValue(
      'results/user-1/job-1.json',
    );

    const outcome = await service.run({ ...baseParams, save: true });

    expect(fileStorageService.reservePath).toHaveBeenCalledWith(
      'results',
      'user-1',
      expect.any(String),
      'json',
    );
    expect(transformationsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TransformationStatus.SUCCESS,
        resultFileId: 'results/user-1/job-1.json',
        resultSizeBytes: 20,
        expiresAt: expect.any(Date) as Date,
      }),
    );

    await outcome.cleanup();
    expect(fileStorageService.delete).not.toHaveBeenCalledWith(
      'results/user-1/job-1.json',
    );
    expect(fileStorageService.delete).toHaveBeenCalledWith(
      'temp/user-1/job-1.csv',
    );
  });

  it('rejects an unsupported conversion pair, records an error history entry, and always cleans up the source', async () => {
    await expect(
      service.run({ ...baseParams, targetFormat: SourceFormat.PNG }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(transformationsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TransformationStatus.ERROR,
        errorCode: 'BadRequestException',
        resultFileId: null,
      }),
    );
    expect(fileStorageService.reservePath).not.toHaveBeenCalled();
    expect(fileStorageService.delete).toHaveBeenCalledWith(
      'temp/user-1/job-1.csv',
    );
  });

  it('records an error history entry when no strategy is registered', async () => {
    strategyRegistry.resolve.mockImplementation(() => {
      throw new NotImplementedException('no strategy');
    });

    await expect(service.run(baseParams)).rejects.toBeInstanceOf(
      NotImplementedException,
    );

    expect(transformationsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TransformationStatus.ERROR,
        errorCode: 'NotImplementedException',
      }),
    );
    expect(fileStorageService.reservePath).not.toHaveBeenCalled();
  });

  it('cleans up a partial output file when the strategy fails mid-conversion', async () => {
    strategyRegistry.resolve.mockReturnValue({
      transform: jest.fn().mockRejectedValue(new Error('bad input')),
    });

    await expect(service.run(baseParams)).rejects.toThrow('bad input');

    expect(transformationsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TransformationStatus.ERROR,
        errorCode: 'INTERNAL_ERROR',
      }),
    );
    expect(fileStorageService.delete).toHaveBeenCalledWith(
      'temp/user-1/job-1.json',
    );
    expect(fileStorageService.delete).toHaveBeenCalledWith(
      'temp/user-1/job-1.csv',
    );
  });
});
