import { parseYaml, toYaml } from './yaml.codec';

describe('yaml codec', () => {
  describe('parseYaml', () => {
    it('parses a block sequence of mappings', () => {
      expect(parseYaml('- a: 1\n- a: 2\n')).toEqual([{ a: 1 }, { a: 2 }]);
    });

    it('wraps a single mapping as a one-row array', () => {
      expect(parseYaml('a: 1\n')).toEqual([{ a: 1 }]);
    });

    it('returns an empty array for empty content', () => {
      expect(parseYaml('')).toEqual([]);
      expect(parseYaml('   ')).toEqual([]);
    });

    it('throws on invalid YAML syntax', () => {
      expect(() => parseYaml('a: [1, 2\n')).toThrow();
    });

    it('throws when an element is not a flat mapping', () => {
      expect(() => parseYaml('- 1\n- 2\n')).toThrow(
        'Element at index 0 must be a flat object',
      );
    });
  });

  describe('toYaml', () => {
    it('serializes rows as a YAML block sequence', () => {
      expect(toYaml([{ a: 1 }])).toBe('- a: 1\n');
    });

    it('serializes an empty row set as an empty sequence', () => {
      expect(toYaml([])).toBe('[]\n');
    });
  });
});
