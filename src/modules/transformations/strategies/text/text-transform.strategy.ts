import { readFile, writeFile } from 'node:fs/promises';

import { BadRequestException } from '@nestjs/common';

import { SourceFormat } from '@/modules/uploads/upload-format';

import { TransformationStrategy } from '../transformation-strategy';
import { parseCsv, toCsv } from './csv.codec';
import { parseJson, toJson } from './json.codec';
import { TextRow } from './text-row';
import { parseXml, toXml } from './xml.codec';
import { parseYaml, toYaml } from './yaml.codec';

export type TextFormat =
  SourceFormat.CSV | SourceFormat.JSON | SourceFormat.XML | SourceFormat.YAML;

const PARSERS: Record<TextFormat, (content: string) => TextRow[]> = {
  [SourceFormat.CSV]: parseCsv,
  [SourceFormat.JSON]: parseJson,
  [SourceFormat.XML]: parseXml,
  [SourceFormat.YAML]: parseYaml,
};

const SERIALIZERS: Record<TextFormat, (rows: TextRow[]) => string> = {
  [SourceFormat.CSV]: toCsv,
  [SourceFormat.JSON]: toJson,
  [SourceFormat.XML]: toXml,
  [SourceFormat.YAML]: toYaml,
};

// One instance per (sourceFormat, targetFormat) pair — see
// TEXT_FORMAT_PAIRS in transformations.module.ts. Adding a 5th text format
// means adding one parser + one serializer above; every existing pair, and
// every new pair against the existing formats, keeps working unchanged.
export class TextTransformStrategy extends TransformationStrategy {
  constructor(
    readonly sourceFormat: TextFormat,
    readonly targetFormat: TextFormat,
  ) {
    super();
  }

  // Text conversions have no options (unlike image quality/dimensions).
  async transform(inputPath: string, outputPath: string): Promise<void> {
    const raw = await readFile(inputPath, 'utf8');
    const content = TextTransformStrategy.stripBom(raw);

    let rows: TextRow[];
    try {
      rows = PARSERS[this.sourceFormat](content);
    } catch (error) {
      throw new BadRequestException(
        `Failed to parse ${this.sourceFormat.toUpperCase()} input: ${(error as Error).message}`,
      );
    }

    let output: string;
    try {
      output = SERIALIZERS[this.targetFormat](rows);
    } catch (error) {
      throw new BadRequestException(
        `Failed to convert to ${this.targetFormat.toUpperCase()}: ${(error as Error).message}`,
      );
    }

    // Only ever written once, after both parse and serialize succeed — never
    // leaves a partial file behind on failure.
    await writeFile(outputPath, output, 'utf8');
  }

  private static stripBom(content: string): string {
    return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  }
}
