import { parseCsv, toCsv } from './csv.codec';

describe('csv codec', () => {
  describe('parseCsv', () => {
    it('parses a header row into an array of string-valued objects', () => {
      expect(parseCsv('name,age\nAnn,30\nBob,25')).toEqual([
        { name: 'Ann', age: '30' },
        { name: 'Bob', age: '25' },
      ]);
    });

    it('returns an empty array for empty content', () => {
      expect(parseCsv('')).toEqual([]);
      expect(parseCsv('   ')).toEqual([]);
    });

    it('strips a leading BOM', () => {
      expect(parseCsv('﻿name\nAnn')).toEqual([{ name: 'Ann' }]);
    });

    it('throws on malformed CSV (unterminated quote)', () => {
      expect(() => parseCsv('name\n"Ann')).toThrow();
    });
  });

  describe('toCsv', () => {
    it('serializes rows with a header, unioning columns across heterogeneous rows', () => {
      const csv = toCsv([
        { a: '1', b: '2' },
        { a: '3', c: '4' },
      ]);

      expect(csv).toBe('a,b,c\n1,2,\n3,,4\n');
    });

    it('returns an empty string for no rows', () => {
      expect(toCsv([])).toBe('');
    });
  });
});
