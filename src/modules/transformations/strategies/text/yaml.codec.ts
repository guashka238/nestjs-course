import { parse, stringify } from 'yaml';

import { assertRow, TextRow } from './text-row';

export function parseYaml(content: string): TextRow[] {
  const trimmed = content.trim();
  if (trimmed === '') {
    return [];
  }

  const parsed: unknown = parse(trimmed);

  if (parsed === null || parsed === undefined) {
    return [];
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item, index) => assertRow(item, index));
  }

  return [assertRow(parsed, 0)];
}

export function toYaml(rows: TextRow[]): string {
  return stringify(rows);
}
