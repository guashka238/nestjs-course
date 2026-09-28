import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

import { collectColumns, TextRow } from './text-row';

export function parseCsv(content: string): TextRow[] {
  if (content.trim() === '') {
    return [];
  }

  return parse<Record<string, string>>(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });
}

export function toCsv(rows: TextRow[]): string {
  if (rows.length === 0) {
    return '';
  }

  return stringify(rows, {
    header: true,
    columns: collectColumns(rows),
  });
}
