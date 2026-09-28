import { parseXml, toXml } from './xml.codec';

describe('xml codec', () => {
  describe('parseXml', () => {
    it('parses repeated <row> children into an array of records', () => {
      expect(
        parseXml('<rows><row><a>1</a><b>x</b></row><row><a>2</a></row></rows>'),
      ).toEqual([{ a: '1', b: 'x' }, { a: '2' }]);
    });

    it('treats an empty element as null', () => {
      expect(parseXml('<rows><row><a>1</a><b></b></row></rows>')).toEqual([
        { a: '1', b: null },
      ]);
    });

    it('returns an empty array for a root with no rows', () => {
      expect(parseXml('<rows></rows>')).toEqual([]);
    });

    it('returns an empty array for empty content', () => {
      expect(parseXml('')).toEqual([]);
      expect(parseXml('   ')).toEqual([]);
    });

    it('throws on malformed XML', () => {
      expect(() => parseXml('<rows><row>')).toThrow('Invalid XML');
    });

    it('never resolves an external/custom entity (XXE-safe)', () => {
      const payload =
        '<rows><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><row><a>&xxe;</a></row></rows>';

      expect(() => parseXml(payload)).toThrow();
    });
  });

  describe('toXml', () => {
    it('serializes rows under a rows/row structure', () => {
      const xml = toXml([{ a: '1', b: 'x' }]);

      expect(xml).toContain('<rows>');
      expect(xml).toContain('<row>');
      expect(xml).toContain('<a>1</a>');
      expect(xml).toContain('<b>x</b>');
    });

    it('round-trips through parseXml', () => {
      const rows = [
        { a: '1', b: 'x' },
        { a: '2', b: 'y' },
      ];

      expect(parseXml(toXml(rows))).toEqual(rows);
    });
  });
});
