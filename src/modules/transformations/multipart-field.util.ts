import { BadRequestException } from '@nestjs/common';
import type { MultipartFields } from '@fastify/multipart';

// busboy parses the multipart body in wire order, so `fields` only contains
// what's been read by the time the file part resolves — clients MUST send
// targetFormat/options/save before the file part for them to be visible here
// (see @fastify/multipart's own README note on field ordering).
export function extractFieldValue(
  fields: MultipartFields,
  name: string,
): string | undefined {
  const field = fields[name];
  const entry = Array.isArray(field) ? field[0] : field;

  if (!entry || entry.type !== 'field') {
    return undefined;
  }

  return typeof entry.value === 'string' ? entry.value : String(entry.value);
}

export function parseJsonField(raw: string | undefined): unknown {
  if (raw === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new BadRequestException(`Invalid JSON`);
  }
}
