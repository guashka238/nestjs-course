import { convertRequestSchema } from './convert-request.schema';

describe('convertRequestSchema', () => {
  it.each(['csv', 'json', 'xml', 'yaml'])(
    'accepts a valid targetFormat (%s)',
    (targetFormat) => {
      const result = convertRequestSchema.validate({ targetFormat });

      expect(result.error).toBeUndefined();
      expect(result.value).toEqual({ targetFormat, save: false });
    },
  );

  it('rejects a missing targetFormat', () => {
    const result = convertRequestSchema.validate({});

    expect(result.error).toBeDefined();
  });

  it('rejects an unsupported targetFormat', () => {
    const result = convertRequestSchema.validate({ targetFormat: 'png' });

    expect(result.error).toBeDefined();
  });

  it('coerces a "true"/"false" string for save', () => {
    const result = convertRequestSchema.validate({
      targetFormat: 'csv',
      save: 'true',
    });

    expect(result.error).toBeUndefined();
    expect((result.value as { save: boolean }).save).toBe(true);
  });
});
