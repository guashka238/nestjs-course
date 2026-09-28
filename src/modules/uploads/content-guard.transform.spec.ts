import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { pipeline } from 'node:stream/promises';
import { Readable, Writable } from 'node:stream';

import { ContentGuardTransform } from './content-guard.transform';
import { PNG_MAGIC_BYTES } from './upload-format';

async function drain(
  source: Readable,
  guard: ContentGuardTransform,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const sink = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });

  await pipeline(source, guard, sink);
  return Buffer.concat(chunks);
}

describe('ContentGuardTransform', () => {
  it('passes through content within the size limit', async () => {
    const guard = new ContentGuardTransform({ maxBytes: 100 });
    const result = await drain(Readable.from(['hello world']), guard);

    expect(result.toString()).toBe('hello world');
  });

  it('rejects content exceeding the size limit', async () => {
    const guard = new ContentGuardTransform({ maxBytes: 5 });

    await expect(
      drain(Readable.from(['this is way too long']), guard),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('passes through content whose magic bytes match', async () => {
    const guard = new ContentGuardTransform({
      maxBytes: 100,
      magicBytes: PNG_MAGIC_BYTES,
    });
    const payload = Buffer.concat([PNG_MAGIC_BYTES, Buffer.from('rest')]);

    const result = await drain(Readable.from([payload]), guard);

    expect(result).toEqual(payload);
  });

  it('rejects content whose magic bytes do not match', async () => {
    const guard = new ContentGuardTransform({
      maxBytes: 100,
      magicBytes: PNG_MAGIC_BYTES,
    });

    await expect(
      drain(Readable.from(['not a png at all']), guard),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('rejects a file too small to contain the required magic bytes', async () => {
    const guard = new ContentGuardTransform({
      maxBytes: 100,
      magicBytes: PNG_MAGIC_BYTES,
    });

    await expect(
      drain(Readable.from([Buffer.from([0x89, 0x50])]), guard),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('verifies magic bytes split across multiple chunks', async () => {
    const first = PNG_MAGIC_BYTES.subarray(0, 4);
    const second = PNG_MAGIC_BYTES.subarray(4);
    const guard = new ContentGuardTransform({
      maxBytes: 100,
      magicBytes: PNG_MAGIC_BYTES,
    });

    const result = await drain(Readable.from([first, second]), guard);

    expect(result).toEqual(PNG_MAGIC_BYTES);
  });

  it('rejects content matching a forbidden pattern', async () => {
    const guard = new ContentGuardTransform({
      maxBytes: 1000,
      forbiddenPatterns: [/<!DOCTYPE/i],
    });

    await expect(
      drain(
        Readable.from(['<?xml version="1.0"?><!DOCTYPE foo><foo/>']),
        guard,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('catches a forbidden pattern split across a chunk boundary', async () => {
    const guard = new ContentGuardTransform({
      maxBytes: 1000,
      forbiddenPatterns: [/<script[\s>]/i],
    });

    await expect(
      drain(Readable.from(['<svg><scr', 'ipt>alert(1)</script></svg>']), guard),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('passes through safe content with forbidden-pattern scanning enabled', async () => {
    const guard = new ContentGuardTransform({
      maxBytes: 1000,
      forbiddenPatterns: [/<script[\s>]/i],
    });

    const result = await drain(
      Readable.from(['<svg><circle r="1"/></svg>']),
      guard,
    );

    expect(result.toString()).toBe('<svg><circle r="1"/></svg>');
  });
});
