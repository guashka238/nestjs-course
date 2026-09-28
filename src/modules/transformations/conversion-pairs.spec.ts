import { BadRequestException } from '@nestjs/common';

import { SourceFormat } from '@/modules/uploads/upload-format';

import { assertSupportedConversion } from './conversion-pairs';

describe('assertSupportedConversion', () => {
  const textFormats = [
    SourceFormat.CSV,
    SourceFormat.JSON,
    SourceFormat.XML,
    SourceFormat.YAML,
  ];

  it.each(
    textFormats.flatMap((source) =>
      textFormats
        .filter((target) => target !== source)
        .map((target) => [source, target] as const),
    ),
  )('allows every distinct text pair %s -> %s', (source, target) => {
    expect(() => assertSupportedConversion(source, target)).not.toThrow();
  });

  it.each(textFormats)(
    'rejects converting a text format to itself (%s -> %s)',
    (format) => {
      expect(() => assertSupportedConversion(format, format)).toThrow(
        BadRequestException,
      );
    },
  );

  it.each([
    [SourceFormat.PNG, SourceFormat.JPEG],
    [SourceFormat.JPEG, SourceFormat.PNG],
    [SourceFormat.SVG, SourceFormat.PNG],
    [SourceFormat.SVG, SourceFormat.JPEG],
  ])('allows the supported image pair %s -> %s', (source, target) => {
    expect(() => assertSupportedConversion(source, target)).not.toThrow();
  });

  it.each([
    [SourceFormat.PNG, SourceFormat.SVG],
    [SourceFormat.JPEG, SourceFormat.SVG],
  ])('permanently rejects vectorization %s -> %s', (source, target) => {
    expect(() => assertSupportedConversion(source, target)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a text-to-image pair', () => {
    expect(() =>
      assertSupportedConversion(SourceFormat.CSV, SourceFormat.PNG),
    ).toThrow(BadRequestException);
  });
});
