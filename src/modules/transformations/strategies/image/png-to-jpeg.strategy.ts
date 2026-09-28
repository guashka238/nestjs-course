import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

import { SourceFormat } from '@/modules/uploads/upload-format';

import {
  TransformationOptions,
  TransformationStrategy,
} from '../transformation-strategy';
import {
  DEFAULT_JPEG_QUALITY,
  DEFAULT_RASTER_BACKGROUND,
} from './image-defaults';

@Injectable()
export class PngToJpegStrategy extends TransformationStrategy {
  readonly sourceFormat = SourceFormat.PNG;
  readonly targetFormat = SourceFormat.JPEG;

  async transform(
    inputPath: string,
    outputPath: string,
    options?: TransformationOptions,
  ): Promise<void> {
    // JPEG has no alpha channel — flatten transparency onto a background
    // first so it doesn't get composited onto black by default.
    await sharp(inputPath)
      .flatten({ background: options?.background ?? DEFAULT_RASTER_BACKGROUND })
      .jpeg({ quality: options?.quality ?? DEFAULT_JPEG_QUALITY })
      .toFile(outputPath);
  }
}
