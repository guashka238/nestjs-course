import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from '@/modules/users/entities/user.entity';

import { RolePermission } from '../entities/role-permission.entity';

@Injectable()
export class RolePermissionsRepository {
  constructor(
    @InjectRepository(RolePermission)
    private readonly repository: Repository<RolePermission>,
  ) {}

  create(data: Partial<RolePermission>): Promise<RolePermission> {
    return this.repository.save(this.repository.create(data));
  }

  findOne(role: Role, permissionId: string): Promise<RolePermission | null> {
    return this.repository.findOneBy({ role, permissionId });
  }

  findByRole(role: Role): Promise<RolePermission[]> {
    return this.repository.findBy({ role });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByPermissionId(permissionId: string): Promise<void> {
    await this.repository.delete({ permissionId });
  }
}
