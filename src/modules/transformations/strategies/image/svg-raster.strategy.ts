import sharp from 'sharp';

import { ConfigService } from '@/core/config/config.service';
import { SourceFormat } from '@/modules/uploads/upload-format';

import {
  TransformationOptions,
  TransformationStrategy,
} from '../transformation-strategy';
import { DEFAULT_RASTER_BACKGROUND } from './image-defaults';

// Shared rasterization logic for SVG -> PNG/JPEG. The upload-time
// ContentGuardTransform already rejects scripts/external references in the
// SVG source; sharp (via libvips/librsvg) is the second layer of defense.
export abstract class SvgRasterStrategy extends TransformationStrategy {
  readonly sourceFormat = SourceFormat.SVG;

  constructor(protected readonly configService: ConfigService) {
    super();
  }

  async transform(
    inputPath: string,
    outputPath: string,
    options?: TransformationOptions,
  ): Promise<void> {
    const background = options?.background ?? DEFAULT_RASTER_BACKGROUND;

    // sharp's default limitInputPixels (~268 megapixels) already guards
    // against decompression bombs during decode.
    let image = sharp(inputPath).flatten({ background });

    if (options?.width !== undefined || options?.height !== undefined) {
      image = image.resize(options.width, options.height, { fit: 'fill' });
    } else {
      // No explicit size requested: keep the SVG's intrinsic dimensions, but
      // never exceed the administrator-configured maximum raster size.
      const maxWidth = Number(this.configService.get('MAX_RASTER_WIDTH'));
      const maxHeight = Number(this.configService.get('MAX_RASTER_HEIGHT'));
      image = image.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    await this.encode(image, options).toFile(outputPath);
  }

  protected abstract encode(
    image: sharp.Sharp,
    options?: TransformationOptions,
  ): sharp.Sharp;
}
