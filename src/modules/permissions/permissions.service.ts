import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Role } from '@/modules/users/entities/user.entity';

import type { CreatePermissionDto } from './dto/create-permission.schema';
import { Permission } from './entities/permission.entity';
import { PermissionsRepository } from './repositories/permissions.repository';
import { RolePermissionsRepository } from './repositories/role-permissions.repository';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly permissionsRepository: PermissionsRepository,
    private readonly rolePermissionsRepository: RolePermissionsRepository,
  ) {}

  async createPermission(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.permissionsRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException('A permission with that name already exists');
    }

    return this.permissionsRepository.create({
      name: dto.name,
      description: dto.description ?? null,
    });
  }

  listPermissions(): Promise<Permission[]> {
    return this.permissionsRepository.findAll();
  }

  // Unlike createPermission, this doesn't throw on a name collision — it
  // returns the existing row instead. Used by seeding, which must be safe
  // to re-run.
  async ensurePermission(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.permissionsRepository.findByName(dto.name);
    if (existing) {
      return existing;
    }

    return this.permissionsRepository.create({
      name: dto.name,
      description: dto.description ?? null,
    });
  }

  async deletePermission(id: string): Promise<void> {
    const permission = await this.permissionsRepository.findById(id);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    // No DB-level cascade (plain indexed column, not a relation) — clean up
    // role assignments referencing this permission ourselves.
    await this.rolePermissionsRepository.deleteByPermissionId(id);
    await this.permissionsRepository.delete(id);
  }

  async assignPermissionToRole(
    role: Role,
    permissionId: string,
  ): Promise<void> {
    const permission = await this.permissionsRepository.findById(permissionId);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    const existing = await this.rolePermissionsRepository.findOne(
      role,
      permissionId,
    );
    if (existing) {
      return;
    }

    await this.rolePermissionsRepository.create({ role, permissionId });
  }

  async revokePermissionFromRole(
    role: Role,
    permissionId: string,
  ): Promise<void> {
    const existing = await this.rolePermissionsRepository.findOne(
      role,
      permissionId,
    );
    if (!existing) {
      return;
    }

    await this.rolePermissionsRepository.delete(existing.id);
  }

  async getPermissionsForRole(role: Role): Promise<Permission[]> {
    const rolePermissions =
      await this.rolePermissionsRepository.findByRole(role);
    return this.permissionsRepository.findByIds(
      rolePermissions.map((rolePermission) => rolePermission.permissionId),
    );
  }

  async getPermissionNamesForRole(role: Role): Promise<string[]> {
    const permissions = await this.getPermissionsForRole(role);
    return permissions.map((permission) => permission.name);
  }
}
