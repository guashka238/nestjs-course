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
import {
  OUTPUT_CONTENT_TYPES,
  SourceFormat,
  UploadKind,
} from '@/modules/uploads/upload-format';

import { CONVERSION_PAIRS } from './conversion-pairs';
import { convertRequestSchema } from './dto/convert-request.schema';
import type { ConvertRequestDto } from './dto/convert-request.schema';
import { extractFieldValue } from './multipart-field.util';
import { TransformationOrchestrationService } from './transformation-orchestration.service';

const TEXT_FORMATS = [
  SourceFormat.CSV,
  SourceFormat.JSON,
  SourceFormat.XML,
  SourceFormat.YAML,
];

// Text (CSV/JSON/XML/YAML) conversion — see TASK.md section 1.3.
@Controller('api/convert')
export class ConvertController {
  private readonly logger = new Logger(ConvertController.name);

  constructor(
    private readonly orchestrationService: TransformationOrchestrationService,
  ) {}

  @Get('formats')
  getFormats(): { source: SourceFormat; target: SourceFormat[] }[] {
    return TEXT_FORMATS.map((source) => ({
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

    const dto = new JoiValidationPipe<ConvertRequestDto>(
      convertRequestSchema,
    ).transform({
      targetFormat: extractFieldValue(multipartFile.fields, 'targetFormat'),
      save: extractFieldValue(multipartFile.fields, 'save'),
    });

    const outcome = await this.orchestrationService.run({
      userId: currentUser.id,
      kind: UploadKind.TEXT,
      filename: multipartFile.filename,
      mimetype: multipartFile.mimetype,
      stream: multipartFile.file,
      targetFormat: dto.targetFormat,
      save: dto.save ?? false,
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
