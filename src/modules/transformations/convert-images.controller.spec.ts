import { createReadStream } from 'node:fs';
import { PassThrough } from 'node:stream';

import { BadRequestException, StreamableFile } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ConfigService } from '@/core/config/config.service';
import { SourceFormat, UploadKind } from '@/modules/uploads/upload-format';

import { ConvertImagesController } from './convert-images.controller';
import { TransformationOrchestrationService } from './transformation-orchestration.service';

jest.mock('node:fs');

describe('ConvertImagesController', () => {
  let controller: ConvertImagesController;
  let orchestrationService: { run: jest.Mock };
  let reply: { header: jest.Mock };

  beforeEach(async () => {
    orchestrationService = {
      run: jest.fn().mockResolvedValue({
        history: { id: 'tx-1' },
        resultPath: '/storage/results/user-1/job-1.jpeg',
        resultFileName: 'photo.jpeg',
        cleanup: jest.fn().mockResolvedValue(undefined),
      }),
    };
    reply = { header: jest.fn() };
    (createReadStream as jest.Mock).mockReturnValue(new PassThrough());

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConvertImagesController],
      providers: [
        {
          provide: TransformationOrchestrationService,
          useValue: orchestrationService,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('10000') },
        },
      ],
    }).compile();

    controller = module.get<ConvertImagesController>(ConvertImagesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFormats', () => {
    it('returns the 4 allowed image conversion directions (no vectorization)', () => {
      expect(controller.getFormats()).toEqual([
        { source: SourceFormat.PNG, target: [SourceFormat.JPEG] },
        { source: SourceFormat.JPEG, target: [SourceFormat.PNG] },
        {
          source: SourceFormat.SVG,
          target: [SourceFormat.PNG, SourceFormat.JPEG],
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

    it('parses JSON options and forwards everything to the orchestration service', async () => {
      const fileStream = new PassThrough();
      const request = {
        file: jest.fn().mockResolvedValue({
          filename: 'photo.png',
          mimetype: 'image/png',
          file: fileStream,
          fields: {
            targetFormat: { type: 'field', value: 'jpeg' },
            save: { type: 'field', value: 'false' },
            options: { type: 'field', value: '{"quality":75}' },
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
        kind: UploadKind.IMAGE,
        filename: 'photo.png',
        mimetype: 'image/png',
        stream: fileStream,
        targetFormat: 'jpeg',
        save: false,
        options: { quality: 75, background: '#ffffff' },
      });
      expect(reply.header).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="photo.jpeg"',
      );
      expect(reply.header).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('rejects malformed JSON in the options field', async () => {
      const request = {
        file: jest.fn().mockResolvedValue({
          filename: 'photo.png',
          mimetype: 'image/png',
          file: new PassThrough(),
          fields: {
            targetFormat: { type: 'field', value: 'jpeg' },
            options: { type: 'field', value: '{not json' },
          },
        }),
      };

      await expect(
        controller.convert(request as never, currentUser, reply as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(orchestrationService.run).not.toHaveBeenCalled();
    });

    it('rejects an out-of-range quality option', async () => {
      const request = {
        file: jest.fn().mockResolvedValue({
          filename: 'photo.png',
          mimetype: 'image/png',
          file: new PassThrough(),
          fields: {
            targetFormat: { type: 'field', value: 'jpeg' },
            options: { type: 'field', value: '{"quality":101}' },
          },
        }),
      };

      await expect(
        controller.convert(request as never, currentUser, reply as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(orchestrationService.run).not.toHaveBeenCalled();
    });
  });
});
