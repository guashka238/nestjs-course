import { assertRow, collectColumns } from './text-row';

describe('assertRow', () => {
  it('returns a flat object unchanged', () => {
    expect(assertRow({ a: 1, b: 'x' }, 0)).toEqual({ a: 1, b: 'x' });
  });

  it('throws for a non-object value', () => {
    expect(() => assertRow(1, 0)).toThrow(
      'Element at index 0 must be a flat object',
    );
    expect(() => assertRow(null, 0)).toThrow(
      'Element at index 0 must be a flat object',
    );
    expect(() => assertRow([1, 2], 0)).toThrow(
      'Element at index 0 must be a flat object',
    );
  });

  it('throws for a nested field value', () => {
    expect(() => assertRow({ a: { b: 1 } }, 2)).toThrow(
      'Field "a" at index 2 must be a scalar value',
    );
  });
});

describe('collectColumns', () => {
  it('returns the union of keys in first-seen order', () => {
    expect(
      collectColumns([
        { a: 1, b: 2 },
        { b: 3, c: 4 },
      ]),
    ).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty array for no rows', () => {
    expect(collectColumns([])).toEqual([]);
  });
});
