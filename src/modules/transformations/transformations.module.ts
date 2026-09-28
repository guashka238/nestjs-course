import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FileStorageModule } from '@/modules/storage/file-storage.module';
import { SecureUploadModule } from '@/modules/uploads/secure-upload.module';
import { SourceFormat } from '@/modules/uploads/upload-format';

import { ConvertImagesController } from './convert-images.controller';
import { ConvertController } from './convert.controller';
import { Transformation } from './entities/transformation.entity';
import { TransformationsRepository } from './repositories/transformations.repository';
import { JpegToPngStrategy } from './strategies/image/jpeg-to-png.strategy';
import { PngToJpegStrategy } from './strategies/image/png-to-jpeg.strategy';
import { SvgToJpegStrategy } from './strategies/image/svg-to-jpeg.strategy';
import { SvgToPngStrategy } from './strategies/image/svg-to-png.strategy';
import {
  TextFormat,
  TextTransformStrategy,
} from './strategies/text/text-transform.strategy';
import {
  TRANSFORMATION_STRATEGIES,
  TransformationStrategyRegistry,
} from './strategies/transformation-strategy.registry';
import { TransformationOrchestrationService } from './transformation-orchestration.service';

// Every distinct ordered pair across the four text formats (12 total).
const TEXT_FORMATS: TextFormat[] = [
  SourceFormat.CSV,
  SourceFormat.JSON,
  SourceFormat.XML,
  SourceFormat.YAML,
];
const TEXT_STRATEGIES = TEXT_FORMATS.flatMap((source) =>
  TEXT_FORMATS.filter((target) => target !== source).map(
    (target) => new TextTransformStrategy(source, target),
  ),
);

@Module({
  imports: [
    TypeOrmModule.forFeature([Transformation]),
    FileStorageModule,
    SecureUploadModule,
  ],
  controllers: [ConvertController, ConvertImagesController],
  providers: [
    TransformationsRepository,
    TransformationStrategyRegistry,
    PngToJpegStrategy,
    JpegToPngStrategy,
    SvgToPngStrategy,
    SvgToJpegStrategy,
    // TextTransformStrategy instances take no dependencies, so they're built
    // directly (TEXT_STRATEGIES above) rather than registered as providers.
    // A new image strategy (with DI dependencies) still needs its own
    // provider added above and to this factory's `inject` array.
    {
      provide: TRANSFORMATION_STRATEGIES,
      useFactory: (
        pngToJpeg: PngToJpegStrategy,
        jpegToPng: JpegToPngStrategy,
        svgToPng: SvgToPngStrategy,
        svgToJpeg: SvgToJpegStrategy,
      ) => [pngToJpeg, jpegToPng, svgToPng, svgToJpeg, ...TEXT_STRATEGIES],
      inject: [
        PngToJpegStrategy,
        JpegToPngStrategy,
        SvgToPngStrategy,
        SvgToJpegStrategy,
      ],
    },
    TransformationOrchestrationService,
  ],
  exports: [TransformationOrchestrationService],
})
export class TransformationsModule {}
