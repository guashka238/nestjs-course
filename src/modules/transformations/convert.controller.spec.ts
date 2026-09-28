import { createReadStream } from 'node:fs';
import { PassThrough } from 'node:stream';

import { BadRequestException, StreamableFile } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { SourceFormat, UploadKind } from '@/modules/uploads/upload-format';

import { ConvertController } from './convert.controller';
import { TransformationOrchestrationService } from './transformation-orchestration.service';

jest.mock('node:fs');

describe('ConvertController', () => {
  let controller: ConvertController;
  let orchestrationService: { run: jest.Mock };
  let reply: { header: jest.Mock };

  beforeEach(async () => {
    orchestrationService = {
      run: jest.fn().mockResolvedValue({
        history: { id: 'tx-1' },
        resultPath: '/storage/results/user-1/job-1.json',
        resultFileName: 'data.json',
        cleanup: jest.fn().mockResolvedValue(undefined),
      }),
    };
    reply = { header: jest.fn() };
    (createReadStream as jest.Mock).mockReturnValue(new PassThrough());

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConvertController],
      providers: [
        {
          provide: TransformationOrchestrationService,
          useValue: orchestrationService,
        },
      ],
    }).compile();

    controller = module.get<ConvertController>(ConvertController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFormats', () => {
    it('returns all 12 text conversion directions', () => {
      const formats = controller.getFormats();

      expect(formats).toEqual([
        {
          source: SourceFormat.CSV,
          target: [SourceFormat.JSON, SourceFormat.XML, SourceFormat.YAML],
        },
        {
          source: SourceFormat.JSON,
          target: [SourceFormat.CSV, SourceFormat.XML, SourceFormat.YAML],
        },
        {
          source: SourceFormat.XML,
          target: [SourceFormat.CSV, SourceFormat.JSON, SourceFormat.YAML],
        },
        {
          source: SourceFormat.YAML,
          target: [SourceFormat.CSV, SourceFormat.JSON, SourceFormat.XML],
        },
      ]);
    });
  });

  describe('convert', () => {
    const currentUser = { id: 'user-1', role: 'user' } as never;

    it('throws BadRequestException when no file part is present', async () => {
      const request = { file: jest.fn().mockResolvedValue(undefined) };

      await expect(
        controller.convert(request as never, currentUser, reply as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('validates fields, runs the orchestration, and streams the result', async () => {
      const fileStream = new PassThrough();
      const request = {
        file: jest.fn().mockResolvedValue({
          filename: 'data.csv',
          mimetype: 'text/csv',
          file: fileStream,
          fields: {
            targetFormat: { type: 'field', value: 'json' },
            save: { type: 'field', value: 'true' },
          },
        }),
      };

      const result = await controller.convert(
        request as never,
        currentUser,
        reply as never,
      );

      expect(orchestrationService.run).toHaveBeenCalledWith({
        userId: 'user-1',
        kind: UploadKind.TEXT,
        filename: 'data.csv',
        mimetype: 'text/csv',
        stream: fileStream,
        targetFormat: 'json',
        save: true,
      });
      expect(reply.header).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="data.json"',
      );
      expect(reply.header).toHaveBeenCalledWith(
        'Content-Type',
        'application/json',
      );
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('rejects an invalid targetFormat before calling the orchestration service', async () => {
      const request = {
        file: jest.fn().mockResolvedValue({
          filename: 'data.csv',
          mimetype: 'text/csv',
          file: new PassThrough(),
          fields: { targetFormat: { type: 'field', value: 'png' } },
        }),
      };

      await expect(
        controller.convert(request as never, currentUser, reply as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(orchestrationService.run).not.toHaveBeenCalled();
    });

    it('wires cleanup to run once the result stream closes', async () => {
      const cleanup = jest.fn().mockResolvedValue(undefined);
      orchestrationService.run.mockResolvedValue({
        history: { id: 'tx-1' },
        resultPath: '/storage/temp/user-1/job-1.json',
        resultFileName: 'data.json',
        cleanup,
      });
      const resultStream = new PassThrough();
      (createReadStream as jest.Mock).mockReturnValue(resultStream);
      const request = {
        file: jest.fn().mockResolvedValue({
          filename: 'data.csv',
          mimetype: 'text/csv',
          file: new PassThrough(),
          fields: { targetFormat: { type: 'field', value: 'json' } },
        }),
      };

      await controller.convert(request as never, currentUser, reply as never);
      resultStream.emit('close');
      await Promise.resolve();

      expect(cleanup).toHaveBeenCalled();
    });
  });
});
