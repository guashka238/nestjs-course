import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

import { SourceFormat } from '@/modules/uploads/upload-format';

import { TransformationStrategy } from '../transformation-strategy';

@Injectable()
export class JpegToPngStrategy extends TransformationStrategy {
  readonly sourceFormat = SourceFormat.JPEG;
  readonly targetFormat = SourceFormat.PNG;

  async transform(inputPath: string, outputPath: string): Promise<void> {
    await sharp(inputPath).png().toFile(outputPath);
  }
}
