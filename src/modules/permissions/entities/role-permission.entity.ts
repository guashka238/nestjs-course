import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Role } from '@/modules/users/entities/user.entity';

// Join row granting one Permission to one Role. Plain indexed columns, no
// TypeORM relations (matches the rest of the project's FK-column-only
// convention) — deleting a Permission must also delete its RolePermission
// rows at the service layer, since there's no DB-level cascade here.
@Entity('role_permissions')
@Index(['role', 'permissionId'], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Index()
  @Column()
  permissionId: string;

  @CreateDateColumn()
  createdAt: Date;
}
