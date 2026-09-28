import { SourceFormat } from '@/modules/uploads/upload-format';

import type { ConvertImageOptionsDto } from '../dto/convert-image-request.schema';

// Only image conversions have options today (JPEG quality; SVG rasterization
// width/height/background) — text strategies simply ignore the parameter.
export type TransformationOptions = ConvertImageOptionsDto;

// One converter for a single (sourceFormat -> targetFormat) pair. New format
// pairs are added by registering a new strategy (see TRANSFORMATION_STRATEGIES
// in transformations.module.ts) — never by editing an existing one, per
// TASK.md's "adding a new module must not require changes to existing
// contracts" requirement.
export abstract class TransformationStrategy {
  abstract readonly sourceFormat: SourceFormat;
  abstract readonly targetFormat: SourceFormat;

  abstract transform(
    inputPath: string,
    outputPath: string,
    options?: TransformationOptions,
  ): Promise<void>;
}
