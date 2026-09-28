import { Injectable } from '@nestjs/common';
import type { Sharp } from 'sharp';

import { SourceFormat } from '@/modules/uploads/upload-format';

import { TransformationOptions } from '../transformation-strategy';
import { DEFAULT_JPEG_QUALITY } from './image-defaults';
import { SvgRasterStrategy } from './svg-raster.strategy';

@Injectable()
export class SvgToJpegStrategy extends SvgRasterStrategy {
  readonly targetFormat = SourceFormat.JPEG;

  protected encode(image: Sharp, options?: TransformationOptions): Sharp {
    return image.jpeg({ quality: options?.quality ?? DEFAULT_JPEG_QUALITY });
  }
}
