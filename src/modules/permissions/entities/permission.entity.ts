import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Convention: "resource:action" (e.g. "users:read") — enforced by
  // create-permission.schema.ts, not at the DB level.
  @Column({ unique: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
