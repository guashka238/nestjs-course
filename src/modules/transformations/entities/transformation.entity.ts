import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { SourceFormat } from '@/modules/uploads/upload-format';

export enum TransformationType {
  FILE = 'file',
  IMAGE = 'image',
}

export enum TransformationStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

// A completed conversion (POST /api/convert or /api/images/convert), i.e. one
// row per TransformationHistoryItem — created once, synchronously, when the
// conversion finishes; there's no pending/processing state to persist since
// the whole operation happens within a single request.
@Entity('transformations')
@Index(['userId', 'createdAt']) // primary access pattern for GET .../history
export class Transformation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Index()
  @Column({ type: 'enum', enum: TransformationType })
  type: TransformationType;

  @Column({ type: 'enum', enum: SourceFormat })
  sourceFormat: SourceFormat;

  @Column({ type: 'enum', enum: SourceFormat })
  targetFormat: SourceFormat;

  @Index()
  @Column({ type: 'enum', enum: TransformationStatus })
  status: TransformationStatus;

  // Original uploaded filename, reused to name the downloaded result.
  @Column()
  sourceFileName: string;

  @Column({ type: 'integer' })
  fileSize: number;

  @Column({ type: 'integer' })
  durationMs: number;

  @Column({ type: 'varchar', nullable: true })
  errorCode: string | null;

  // Opaque FileStorageService path, never exposed to clients directly — set
  // only when the request asked to save the result (save=true) and it succeeded.
  @Column({ type: 'varchar', nullable: true })
  resultFileId: string | null;

  @Column({ type: 'integer', nullable: true })
  resultSizeBytes: number | null;

  // Matches the history retention period; null when no result was saved.
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
