import { buildConvertImageRequestSchema } from './convert-image-request.schema';
import type { ConvertImageRequestDto } from './convert-image-request.schema';

describe('buildConvertImageRequestSchema', () => {
  const schema = buildConvertImageRequestSchema(4000, 4000);

  it('accepts a bare targetFormat and defaults save to false', () => {
    const result = schema.validate({ targetFormat: 'png' });

    expect(result.error).toBeUndefined();
    expect(result.value).toEqual({ targetFormat: 'png', save: false });
  });

  it('rejects an unsupported targetFormat', () => {
    const result = schema.validate({ targetFormat: 'csv' });

    expect(result.error).toBeDefined();
  });

  it('accepts valid options and defaults background', () => {
    const result = schema.validate({
      targetFormat: 'jpeg',
      options: { quality: 80, width: 800, height: 600 },
    });

    expect(result.error).toBeUndefined();
    expect((result.value as ConvertImageRequestDto).options).toEqual({
      quality: 80,
      width: 800,
      height: 600,
      background: '#ffffff',
    });
  });

  it('rejects quality outside 1-100', () => {
    const result = schema.validate({
      targetFormat: 'jpeg',
      options: { quality: 101 },
    });

    expect(result.error).toBeDefined();
  });

  it('rejects width/height beyond the configured maximum', () => {
    const result = schema.validate({
      targetFormat: 'png',
      options: { width: 5000, height: 100 },
    });

    expect(result.error).toBeDefined();
  });

  it('rejects a malformed background color', () => {
    const result = schema.validate({
      targetFormat: 'png',
      options: { background: 'not-a-color' },
    });

    expect(result.error).toBeDefined();
  });

  it('coerces a "true"/"false" string for save', () => {
    const result = schema.validate({ targetFormat: 'png', save: 'true' });

    expect(result.error).toBeUndefined();
    expect((result.value as ConvertImageRequestDto).save).toBe(true);
  });
});
