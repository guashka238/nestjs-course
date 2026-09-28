import { Injectable } from '@nestjs/common';
import type { Sharp } from 'sharp';

import { SourceFormat } from '@/modules/uploads/upload-format';

import { SvgRasterStrategy } from './svg-raster.strategy';

@Injectable()
export class SvgToPngStrategy extends SvgRasterStrategy {
  readonly targetFormat = SourceFormat.PNG;

  protected encode(image: Sharp): Sharp {
    return image.png();
  }
}
