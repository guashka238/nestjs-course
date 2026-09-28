import { assertRow, TextRow } from './text-row';

export function parseJson(content: string): TextRow[] {
  const trimmed = content.trim();
  if (trimmed === '') {
    return [];
  }

  const parsed: unknown = JSON.parse(trimmed);

  if (Array.isArray(parsed)) {
    return parsed.map((item, index) => assertRow(item, index));
  }

  return [assertRow(parsed, 0)];
}

export function toJson(rows: TextRow[]): string {
  return JSON.stringify(rows, null, 2);
}
