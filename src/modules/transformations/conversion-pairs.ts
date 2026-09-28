import { BadRequestException } from '@nestjs/common';

import { SourceFormat } from '@/modules/uploads/upload-format';

// All 12 text directions (every pair across csv/json/xml/yaml) plus the 4
// image directions allowed by the spec — png/jpeg -> svg is a permanent
// restriction (vectorization is out of scope), so it's deliberately absent.
export const CONVERSION_PAIRS: Record<SourceFormat, SourceFormat[]> = {
  [SourceFormat.CSV]: [SourceFormat.JSON, SourceFormat.XML, SourceFormat.YAML],
  [SourceFormat.JSON]: [SourceFormat.CSV, SourceFormat.XML, SourceFormat.YAML],
  [SourceFormat.XML]: [SourceFormat.CSV, SourceFormat.JSON, SourceFormat.YAML],
  [SourceFormat.YAML]: [SourceFormat.CSV, SourceFormat.JSON, SourceFormat.XML],
  [SourceFormat.PNG]: [SourceFormat.JPEG],
  [SourceFormat.JPEG]: [SourceFormat.PNG],
  [SourceFormat.SVG]: [SourceFormat.PNG, SourceFormat.JPEG],
};

export function assertSupportedConversion(
  source: SourceFormat,
  target: SourceFormat,
): void {
  if (!CONVERSION_PAIRS[source].includes(target)) {
    throw new BadRequestException(
      `Unsupported conversion direction: ${source} -> ${target}`,
    );
  }
}
