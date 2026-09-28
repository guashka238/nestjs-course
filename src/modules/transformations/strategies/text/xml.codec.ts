import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';

import { TextRow } from './text-row';

// Documented shape (see text-row.ts): <rows><row><col>value</col>...</row></rows>.
// processEntities: false means DOCTYPE/ENTITY declarations are never
// resolved — fast-xml-parser has no DTD support at all, so this is
// inherently immune to classic XXE, not just configured to reject it.
const parser = new XMLParser({
  ignoreAttributes: true,
  processEntities: false,
  parseTagValue: false, // keep every value as a string, consistent with CSV
  isArray: (name) => name === 'row',
});

const builder = new XMLBuilder({ format: true });

export function parseXml(content: string): TextRow[] {
  const trimmed = content.trim();
  if (trimmed === '') {
    return [];
  }

  const validation = XMLValidator.validate(trimmed);
  if (validation !== true) {
    throw new Error(
      `Invalid XML: ${validation.err.msg} (line ${validation.err.line})`,
    );
  }

  const parsed = parser.parse(trimmed) as Record<string, unknown>;
  const rootKey = Object.keys(parsed)[0];
  const root = rootKey ? parsed[rootKey] : undefined;

  if (!root || typeof root !== 'object') {
    return [];
  }

  const rawRows = (root as Record<string, unknown>).row;
  if (rawRows === undefined) {
    return [];
  }

  const rowsArray = Array.isArray(rawRows) ? rawRows : [rawRows];
  return rowsArray.map(normalizeXmlRow);
}

// XML has no way to distinguish an empty string from an absent value, so an
// empty element (<age></age>) is treated as null rather than "" — unlike
// CSV/JSON/YAML, which do preserve the empty-string/null distinction.
function normalizeXmlRow(row: unknown): TextRow {
  if (typeof row !== 'object' || row === null) {
    return {};
  }

  const result: TextRow = {};
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    if (value === undefined || value === '') {
      result[key] = null;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = String(value);
    } else if (typeof value === 'string') {
      result[key] = value;
    } else {
      result[key] = null;
    }
  }
  return result;
}

export function toXml(rows: TextRow[]): string {
  return builder.build({ rows: { row: rows } });
}
