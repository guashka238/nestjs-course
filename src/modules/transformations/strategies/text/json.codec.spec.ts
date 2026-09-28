import { parseJson, toJson } from './json.codec';

describe('json codec', () => {
  describe('parseJson', () => {
    it('parses an array of flat objects', () => {
      expect(parseJson('[{"a":1},{"a":2}]')).toEqual([{ a: 1 }, { a: 2 }]);
    });

    it('wraps a single object as a one-row array', () => {
      expect(parseJson('{"a":1}')).toEqual([{ a: 1 }]);
    });

    it('returns an empty array for empty content', () => {
      expect(parseJson('')).toEqual([]);
      expect(parseJson('   ')).toEqual([]);
    });

    it('throws on invalid JSON syntax', () => {
      expect(() => parseJson('{not valid')).toThrow();
    });

    it('throws when an array element is not a flat object', () => {
      expect(() => parseJson('[1, 2]')).toThrow(
        'Element at index 0 must be a flat object',
      );
      expect(() => parseJson('[[1]]')).toThrow(
        'Element at index 0 must be a flat object',
      );
    });

    it('throws when a field is a nested object/array', () => {
      expect(() => parseJson('[{"a":{"b":1}}]')).toThrow(
        'Field "a" at index 0 must be a scalar value',
      );
    });
  });

  describe('toJson', () => {
    it('serializes rows as a pretty-printed array', () => {
      expect(toJson([{ a: 1 }])).toBe('[\n  {\n    "a": 1\n  }\n]');
    });

    it('serializes an empty row set as an empty array', () => {
      expect(toJson([])).toBe('[]');
    });
  });
});
