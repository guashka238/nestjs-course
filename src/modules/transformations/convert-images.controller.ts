import { createReadStream } from 'node:fs';

import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JoiValidationPipe } from '@/common/pipes/joi-validation.pipe';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { ConfigService } from '@/core/config/config.service';
import {
  OUTPUT_CONTENT_TYPES,
  SourceFormat,
  UploadKind,
} from '@/modules/uploads/upload-format';

import { CONVERSION_PAIRS } from './conversion-pairs';
import { buildConvertImageRequestSchema } from './dto/convert-image-request.schema';
import type { ConvertImageRequestDto } from './dto/convert-image-request.schema';
import { extractFieldValue, parseJsonField } from './multipart-field.util';
import { TransformationOrchestrationService } from './transformation-orchestration.service';

const IMAGE_FORMATS = [SourceFormat.PNG, SourceFormat.JPEG, SourceFormat.SVG];

// Image (PNG/JPEG/SVG) conversion — see TASK.md section "Image transformation".
@Controller('api/images/convert')
export class ConvertImagesController {
  private readonly logger = new Logger(ConvertImagesController.name);

  constructor(
    private readonly orchestrationService: TransformationOrchestrationService,
    private readonly configService: ConfigService,
  ) {}

  @Get('formats')
  getFormats(): { source: SourceFormat; target: SourceFormat[] }[] {
    return IMAGE_FORMATS.map((source) => ({
      source,
      target: CONVERSION_PAIRS[source],
    }));
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async convert(
    @Req() request: FastifyRequest,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<StreamableFile> {
    const multipartFile = await request.file();
    if (!multipartFile) {
      throw new BadRequestException('file is required');
    }

    const schema = buildConvertImageRequestSchema(
      Number(this.configService.get('MAX_RASTER_WIDTH')),
      Number(this.configService.get('MAX_RASTER_HEIGHT')),
    );
    const dto = new JoiValidationPipe<ConvertImageRequestDto>(schema).transform(
      {
        targetFormat: extractFieldValue(multipartFile.fields, 'targetFormat'),
        save: extractFieldValue(multipartFile.fields, 'save'),
        options: parseJsonField(
          extractFieldValue(multipartFile.fields, 'options'),
        ),
      },
    );

    const outcome = await this.orchestrationService.run({
      userId: currentUser.id,
      kind: UploadKind.IMAGE,
      filename: multipartFile.filename,
      mimetype: multipartFile.mimetype,
      stream: multipartFile.file,
      targetFormat: dto.targetFormat,
      save: dto.save ?? false,
      options: dto.options,
    });

    reply.header(
      'Content-Disposition',
      `attachment; filename="${outcome.resultFileName}"`,
    );
    reply.header('Content-Type', OUTPUT_CONTENT_TYPES[dto.targetFormat]);

    const resultStream = createReadStream(outcome.resultPath);
    resultStream.on('close', () => {
      outcome.cleanup().catch((error: Error) => {
        this.logger.warn(`Result cleanup failed: ${error.message}`);
      });
    });

    return new StreamableFile(resultStream);
  }
}
