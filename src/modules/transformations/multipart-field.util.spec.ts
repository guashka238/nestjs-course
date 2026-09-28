import { BadRequestException } from '@nestjs/common';
import type { MultipartFields } from '@fastify/multipart';

import { extractFieldValue, parseJsonField } from './multipart-field.util';

describe('extractFieldValue', () => {
  it('returns the string value of a field', () => {
    const fields = {
      targetFormat: { type: 'field', value: 'json' },
    } as unknown as MultipartFields;

    expect(extractFieldValue(fields, 'targetFormat')).toBe('json');
  });

  it('takes the first entry when a field is repeated', () => {
    const fields = {
      targetFormat: [
        { type: 'field', value: 'json' },
        { type: 'field', value: 'xml' },
      ],
    } as unknown as MultipartFields;

    expect(extractFieldValue(fields, 'targetFormat')).toBe('json');
  });

  it('returns undefined for a missing field', () => {
    expect(extractFieldValue({}, 'targetFormat')).toBeUndefined();
  });

  it('returns undefined for a file-type entry', () => {
    const fields = {
      file: { type: 'file' },
    } as unknown as MultipartFields;

    expect(extractFieldValue(fields, 'file')).toBeUndefined();
  });
});

describe('parseJsonField', () => {
  it('returns undefined when the input is undefined', () => {
    expect(parseJsonField(undefined)).toBeUndefined();
  });

  it('parses valid JSON', () => {
    expect(parseJsonField('{"quality":80}')).toEqual({ quality: 80 });
  });

  it('throws BadRequestException for invalid JSON', () => {
    expect(() => parseJsonField('{not json')).toThrow(BadRequestException);
  });
});
