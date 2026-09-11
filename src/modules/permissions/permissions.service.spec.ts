import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Role } from '@/modules/users/entities/user.entity';

import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { PermissionsRepository } from './repositories/permissions.repository';
import { PermissionsService } from './permissions.service';
import { RolePermissionsRepository } from './repositories/role-permissions.repository';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let permissionsRepository: {
    findByName: jest.Mock;
    create: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    findByIds: jest.Mock;
    delete: jest.Mock;
  };
  let rolePermissionsRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    findByRole: jest.Mock;
    delete: jest.Mock;
    deleteByPermissionId: jest.Mock;
  };

  const permission: Permission = {
    id: 'perm-1',
    name: 'users:read',
    description: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    permissionsRepository = {
      findByName: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      delete: jest.fn(),
    };
    rolePermissionsRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      findByRole: jest.fn(),
      delete: jest.fn(),
      deleteByPermissionId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PermissionsRepository, useValue: permissionsRepository },
        {
          provide: RolePermissionsRepository,
          useValue: rolePermissionsRepository,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  describe('createPermission', () => {
    it('throws ConflictException when the name is already taken', async () => {
      permissionsRepository.findByName.mockResolvedValue(permission);

      await expect(
        service.createPermission({ name: 'users:read' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(permissionsRepository.create).not.toHaveBeenCalled();
    });

    it('creates the permission when the name is free', async () => {
      permissionsRepository.findByName.mockResolvedValue(null);
      permissionsRepository.create.mockResolvedValue(permission);

      const result = await service.createPermission({ name: 'users:read' });

      expect(permissionsRepository.create).toHaveBeenCalledWith({
        name: 'users:read',
        description: null,
      });
      expect(result).toBe(permission);
    });
  });

  describe('ensurePermission', () => {
    it('returns the existing permission without creating a duplicate', async () => {
      permissionsRepository.findByName.mockResolvedValue(permission);

      const result = await service.ensurePermission({ name: 'users:read' });

      expect(permissionsRepository.create).not.toHaveBeenCalled();
      expect(result).toBe(permission);
    });

    it('creates the permission when it does not already exist', async () => {
      permissionsRepository.findByName.mockResolvedValue(null);
      permissionsRepository.create.mockResolvedValue(permission);

      const result = await service.ensurePermission({ name: 'users:read' });

      expect(permissionsRepository.create).toHaveBeenCalledWith({
        name: 'users:read',
        description: null,
      });
      expect(result).toBe(permission);
    });
  });

  describe('deletePermission', () => {
    it('throws NotFoundException when the permission does not exist', async () => {
      permissionsRepository.findById.mockResolvedValue(null);

      await expect(service.deletePermission('perm-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(
        rolePermissionsRepository.deleteByPermissionId,
      ).not.toHaveBeenCalled();
    });

    it('deletes role assignments before deleting the permission itself', async () => {
      permissionsRepository.findById.mockResolvedValue(permission);

      await service.deletePermission('perm-1');

      expect(
        rolePermissionsRepository.deleteByPermissionId,
      ).toHaveBeenCalledWith('perm-1');
      expect(permissionsRepository.delete).toHaveBeenCalledWith('perm-1');
    });
  });

  describe('assignPermissionToRole', () => {
    it('throws NotFoundException when the permission does not exist', async () => {
      permissionsRepository.findById.mockResolvedValue(null);

      await expect(
        service.assignPermissionToRole(Role.ADMIN, 'perm-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(rolePermissionsRepository.create).not.toHaveBeenCalled();
    });

    it('does nothing when already assigned (idempotent)', async () => {
      permissionsRepository.findById.mockResolvedValue(permission);
      rolePermissionsRepository.findOne.mockResolvedValue({
        id: 'rp-1',
      });

      await service.assignPermissionToRole(Role.ADMIN, 'perm-1');

      expect(rolePermissionsRepository.create).not.toHaveBeenCalled();
    });

    it('creates the assignment when not already present', async () => {
      permissionsRepository.findById.mockResolvedValue(permission);
      rolePermissionsRepository.findOne.mockResolvedValue(null);

      await service.assignPermissionToRole(Role.ADMIN, 'perm-1');

      expect(rolePermissionsRepository.create).toHaveBeenCalledWith({
        role: Role.ADMIN,
        permissionId: 'perm-1',
      });
    });
  });

  describe('revokePermissionFromRole', () => {
    it('does nothing when no assignment exists (idempotent)', async () => {
      rolePermissionsRepository.findOne.mockResolvedValue(null);

      await service.revokePermissionFromRole(Role.ADMIN, 'perm-1');

      expect(rolePermissionsRepository.delete).not.toHaveBeenCalled();
    });

    it('deletes the assignment when it exists', async () => {
      rolePermissionsRepository.findOne.mockResolvedValue({
        id: 'rp-1',
      });

      await service.revokePermissionFromRole(Role.ADMIN, 'perm-1');

      expect(rolePermissionsRepository.delete).toHaveBeenCalledWith('rp-1');
    });
  });

  describe('getPermissionsForRole / getPermissionNamesForRole', () => {
    it('joins role-permission rows against permissions', async () => {
      rolePermissionsRepository.findByRole.mockResolvedValue([
        { permissionId: 'perm-1' } as RolePermission,
      ]);
      permissionsRepository.findByIds.mockResolvedValue([permission]);

      const permissions = await service.getPermissionsForRole(Role.ADMIN);
      expect(permissionsRepository.findByIds).toHaveBeenCalledWith(['perm-1']);
      expect(permissions).toEqual([permission]);

      const names = await service.getPermissionNamesForRole(Role.ADMIN);
      expect(names).toEqual(['users:read']);
    });
  });
});
