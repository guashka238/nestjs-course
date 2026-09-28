import Joi from 'joi';

import { SourceFormat } from '@/modules/uploads/upload-format';

export const TEXT_TARGET_FORMATS = [
  SourceFormat.CSV,
  SourceFormat.JSON,
  SourceFormat.XML,
  SourceFormat.YAML,
] as const;

export interface ConvertRequestDto {
  targetFormat: SourceFormat;
  save?: boolean;
}

export const convertRequestSchema = Joi.object<ConvertRequestDto>({
  targetFormat: Joi.string()
    .valid(...TEXT_TARGET_FORMATS)
    .required(),
  save: Joi.boolean().optional().default(false),
});
