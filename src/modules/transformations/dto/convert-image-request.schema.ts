import Joi from 'joi';

import { SourceFormat } from '@/modules/uploads/upload-format';

export const IMAGE_TARGET_FORMATS = [
  SourceFormat.PNG,
  SourceFormat.JPEG,
  SourceFormat.SVG,
] as const;

export interface ConvertImageOptionsDto {
  quality?: number;
  width?: number;
  height?: number;
  background?: string;
}

export interface ConvertImageRequestDto {
  targetFormat: SourceFormat;
  options?: ConvertImageOptionsDto;
  save?: boolean;
}

// Max raster dimensions are runtime config (MAX_RASTER_WIDTH/HEIGHT), so the
// schema is built per-request rather than as a static module-level constant.
export function buildConvertImageRequestSchema(
  maxWidth: number,
  maxHeight: number,
): Joi.ObjectSchema<ConvertImageRequestDto> {
  return Joi.object<ConvertImageRequestDto>({
    targetFormat: Joi.string()
      .valid(...IMAGE_TARGET_FORMATS)
      .required(),
    options: Joi.object<ConvertImageOptionsDto>({
      quality: Joi.number().integer().min(1).max(100),
      width: Joi.number().integer().min(1).max(maxWidth),
      height: Joi.number().integer().min(1).max(maxHeight),
      background: Joi.string()
        .pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
        .default('#ffffff'),
    }).optional(),
    save: Joi.boolean().optional().default(false),
  });
}
