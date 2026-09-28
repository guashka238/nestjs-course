import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Transform, TransformCallback } from 'node:stream';

// Kept generous relative to the longest forbidden pattern so a match split
// across a chunk boundary is still caught by one of the two overlapping
// window checks either side of the split.
const SLIDING_WINDOW_OVERLAP = 64;

export interface ContentGuardOptions {
  maxBytes: number;
  // Exact required byte prefix (e.g. the PNG signature).
  magicBytes?: Buffer;
  // Scanned (case-insensitively, via the regex) across a sliding text
  // window; used for XXE/SVG-script style content checks.
  forbiddenPatterns?: RegExp[];
}

// Streams a file to disk while enforcing a per-format size cap and, where
// configured, a magic-byte signature check and forbidden-content scan —
// without buffering the whole file in memory.
export class ContentGuardTransform extends Transform {
  private bytesSeen = 0;
  private header = Buffer.alloc(0);
  private headerVerified = false;
  private tail = '';

  constructor(private readonly options: ContentGuardOptions) {
    super();
  }

  _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    this.bytesSeen += chunk.length;
    if (this.bytesSeen > this.options.maxBytes) {
      callback(
        new PayloadTooLargeException(
          'File exceeds the maximum size allowed for this format',
        ),
      );
      return;
    }

    if (this.options.magicBytes && !this.headerVerified) {
      const error = this.verifyHeader(chunk);
      if (error) {
        callback(error);
        return;
      }
    }

    if (this.options.forbiddenPatterns?.length) {
      const window = this.tail + chunk.toString('utf8');
      for (const pattern of this.options.forbiddenPatterns) {
        if (pattern.test(window)) {
          callback(
            new BadRequestException('File content failed the safety check'),
          );
          return;
        }
      }
      this.tail = window.slice(-SLIDING_WINDOW_OVERLAP);
    }

    callback(null, chunk);
  }

  _flush(callback: TransformCallback): void {
    if (this.options.magicBytes && !this.headerVerified) {
      callback(
        new UnsupportedMediaTypeException(
          'File is too small to be a valid file of the declared format',
        ),
      );
      return;
    }
    callback();
  }

  private verifyHeader(chunk: Buffer): Error | null {
    const magicBytes = this.options.magicBytes;
    if (!magicBytes) {
      return null;
    }

    this.header = Buffer.concat([this.header, chunk]).subarray(
      0,
      magicBytes.length,
    );
    if (this.header.length < magicBytes.length) {
      return null;
    }

    if (!this.header.equals(magicBytes)) {
      return new UnsupportedMediaTypeException(
        'File content does not match its declared format',
      );
    }

    this.headerVerified = true;
    return null;
  }
}
