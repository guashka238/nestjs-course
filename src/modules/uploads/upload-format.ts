import type { Config } from '@/core/config/config.types';

export enum UploadKind {
  TEXT = 'text',
  IMAGE = 'image',
}

export enum SourceFormat {
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
  YAML = 'yaml',
  PNG = 'png',
  JPEG = 'jpeg',
  SVG = 'svg',
}

export const FORMAT_KIND: Record<SourceFormat, UploadKind> = {
  [SourceFormat.CSV]: UploadKind.TEXT,
  [SourceFormat.JSON]: UploadKind.TEXT,
  [SourceFormat.XML]: UploadKind.TEXT,
  [SourceFormat.YAML]: UploadKind.TEXT,
  [SourceFormat.PNG]: UploadKind.IMAGE,
  [SourceFormat.JPEG]: UploadKind.IMAGE,
  [SourceFormat.SVG]: UploadKind.IMAGE,
};

// Extensions accepted for each format; also doubles as the extension the
// file is persisted under via FileStorageService.
export const EXTENSION_TO_FORMAT: Record<string, SourceFormat> = {
  csv: SourceFormat.CSV,
  json: SourceFormat.JSON,
  xml: SourceFormat.XML,
  yaml: SourceFormat.YAML,
  yml: SourceFormat.YAML,
  png: SourceFormat.PNG,
  jpg: SourceFormat.JPEG,
  jpeg: SourceFormat.JPEG,
  svg: SourceFormat.SVG,
};

// The declared multipart mimetype must be one of these for the resolved
// format — a cheap check to catch an extension/content-type mismatch before
// any content is read.
export const ALLOWED_MIME_TYPES: Record<SourceFormat, string[]> = {
  [SourceFormat.CSV]: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
  [SourceFormat.JSON]: ['application/json', 'text/plain'],
  [SourceFormat.XML]: ['application/xml', 'text/xml'],
  [SourceFormat.YAML]: [
    'application/x-yaml',
    'application/yaml',
    'text/yaml',
    'text/plain',
  ],
  [SourceFormat.PNG]: ['image/png'],
  [SourceFormat.JPEG]: ['image/jpeg'],
  [SourceFormat.SVG]: ['image/svg+xml'],
};

// The single canonical Content-Type used when *we* produce a file of this
// format (as opposed to ALLOWED_MIME_TYPES, which accepts several aliases
// for a given format on the way in).
export const OUTPUT_CONTENT_TYPES: Record<SourceFormat, string> = {
  [SourceFormat.CSV]: 'text/csv',
  [SourceFormat.JSON]: 'application/json',
  [SourceFormat.XML]: 'application/xml',
  [SourceFormat.YAML]: 'application/x-yaml',
  [SourceFormat.PNG]: 'image/png',
  [SourceFormat.JPEG]: 'image/jpeg',
  [SourceFormat.SVG]: 'image/svg+xml',
};

export const FORMAT_CONFIG_KEY: Record<SourceFormat, keyof Config> = {
  [SourceFormat.CSV]: 'UPLOAD_MAX_SIZE_CSV_BYTES',
  [SourceFormat.JSON]: 'UPLOAD_MAX_SIZE_JSON_BYTES',
  [SourceFormat.XML]: 'UPLOAD_MAX_SIZE_XML_BYTES',
  [SourceFormat.YAML]: 'UPLOAD_MAX_SIZE_YAML_BYTES',
  [SourceFormat.PNG]: 'UPLOAD_MAX_SIZE_PNG_BYTES',
  [SourceFormat.JPEG]: 'UPLOAD_MAX_SIZE_JPEG_BYTES',
  [SourceFormat.SVG]: 'UPLOAD_MAX_SIZE_SVG_BYTES',
};

export const PNG_MAGIC_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
export const JPEG_MAGIC_BYTES = Buffer.from([0xff, 0xd8, 0xff]);

export const MAGIC_BYTES: Partial<Record<SourceFormat, Buffer>> = {
  [SourceFormat.PNG]: PNG_MAGIC_BYTES,
  [SourceFormat.JPEG]: JPEG_MAGIC_BYTES,
};

// Defense in depth: the real XXE/script protection belongs to the parser
// used at transformation time (entity resolution disabled, safe SVG
// rendering); these are a cheap upload-time reject for the obvious cases.
export const XML_UNSAFE_PATTERNS = [/<!DOCTYPE/i, /<!ENTITY/i];
export const SVG_UNSAFE_PATTERNS = [
  /<!DOCTYPE/i,
  /<!ENTITY/i,
  /<script[\s>]/i,
  /\bon\w+\s*=/i,
  /javascript:/i,
  /\b(?:xlink:href|href)\s*=\s*["']\s*(?:https?:)?\/\//i,
];

export const FORBIDDEN_PATTERNS: Partial<Record<SourceFormat, RegExp[]>> = {
  [SourceFormat.XML]: XML_UNSAFE_PATTERNS,
  [SourceFormat.SVG]: SVG_UNSAFE_PATTERNS,
};
