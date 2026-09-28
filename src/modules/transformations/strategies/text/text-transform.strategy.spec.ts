import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

import { BadRequestException } from '@nestjs/common';

import { SourceFormat } from '@/modules/uploads/upload-format';

import { TextTransformStrategy } from './text-transform.strategy';

describe('TextTransformStrategy', () => {
  let dir: string;
  let inputPath: string;
  let outputPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'text-transform-'));
    inputPath = path.join(dir, 'in');
    outputPath = path.join(dir, 'out');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('exposes the configured source/target format', () => {
    const strategy = new TextTransformStrategy(
      SourceFormat.CSV,
      SourceFormat.JSON,
    );

    expect(strategy.sourceFormat).toBe(SourceFormat.CSV);
    expect(strategy.targetFormat).toBe(SourceFormat.JSON);
  });

  it('converts CSV to JSON end-to-end via the filesystem', async () => {
    await writeFile(inputPath, 'a,b\n1,2\n', 'utf8');
    const strategy = new TextTransformStrategy(
      SourceFormat.CSV,
      SourceFormat.JSON,
    );

    await strategy.transform(inputPath, outputPath);

    const output = await readFile(outputPath, 'utf8');
    expect(JSON.parse(output)).toEqual([{ a: '1', b: '2' }]);
  });

  it('strips a leading BOM before parsing', async () => {
    await writeFile(inputPath, '﻿{"a":1}', 'utf8');
    const strategy = new TextTransformStrategy(
      SourceFormat.JSON,
      SourceFormat.YAML,
    );

    await strategy.transform(inputPath, outputPath);

    expect(await readFile(outputPath, 'utf8')).toBe('- a: 1\n');
  });

  it('rejects malformed source content with a BadRequestException', async () => {
    await writeFile(inputPath, '{not valid json', 'utf8');
    const strategy = new TextTransformStrategy(
      SourceFormat.JSON,
      SourceFormat.CSV,
    );

    await expect(
      strategy.transform(inputPath, outputPath),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(readFile(outputPath, 'utf8')).rejects.toThrow();
  });

  it('wraps a non-flat source structure as a BadRequestException too', async () => {
    // Valid JSON syntax, but a nested field isn't a flat row.
    await writeFile(inputPath, '[{"a":{"b":1}}]', 'utf8');
    const strategy = new TextTransformStrategy(
      SourceFormat.JSON,
      SourceFormat.CSV,
    );

    await expect(
      strategy.transform(inputPath, outputPath),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
