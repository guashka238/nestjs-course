import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TransformationCategory {
  TEXT = 'text',
  IMAGE = 'image',
}

export enum TransformationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Doubles as the transformation-history record read by GET /transformations.
@Entity('transformation_jobs')
@Index(['userId', 'createdAt']) // primary access pattern for the history endpoint
export class TransformationJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: TransformationCategory })
  category: TransformationCategory;

  @Column()
  sourceFormat: string;

  @Column()
  targetFormat: string;

  @Index()
  @Column({
    type: 'enum',
    enum: TransformationStatus,
    default: TransformationStatus.PENDING,
  })
  status: TransformationStatus;

  @Column()
  sourceFileName: string;

  @Column({ type: 'integer' })
  sourceSizeBytes: number;

  @Column({ type: 'varchar', nullable: true })
  resultFilePath: string | null;

  @Column({ type: 'integer', nullable: true })
  resultSizeBytes: number | null;

  @Column({ type: 'varchar', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
