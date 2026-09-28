// Canonical internal representation shared by all four text formats: an
// array of flat records ("table rows"). This is what TASK.md's "internal
// representation (object/array/table)" resolves to here — chosen because
// it's what CSV naturally is, and every one of JSON/XML/YAML can represent
// it losslessly. Ambiguous cases (documented, per TASK.md 1.4):
//   - CSV -> *: every value is a string (CSV has no native types; no
//     numeric/boolean inference is attempted, to avoid silently mangling
//     values like a zero-padded postal code).
//   - JSON/YAML -> *: a single (non-array) document is treated as one row;
//     an array is used as-is. Elements/documents must be flat objects
//     (object values are scalars, not nested objects/arrays) — anything
//     else is rejected as an unsupported structure for this conversion.
//   - XML -> *: root element's <row> children map to columns by child
//     element name; attributes are ignored.
export type TextRow = Record<string, string | number | boolean | null>;

export function assertRow(value: unknown, index: number): TextRow {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Element at index ${index} must be a flat object`);
  }

  for (const [key, fieldValue] of Object.entries(value)) {
    if (typeof fieldValue === 'object' && fieldValue !== null) {
      throw new Error(
        `Field "${key}" at index ${index} must be a scalar value, not a nested object/array`,
      );
    }
  }

  return value as TextRow;
}

export function collectColumns(rows: TextRow[]): string[] {
  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) {
        columns.push(key);
      }
    }
  }
  return columns;
}
