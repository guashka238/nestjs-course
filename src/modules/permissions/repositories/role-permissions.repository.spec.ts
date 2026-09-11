import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Role } from '@/modules/users/entities/user.entity';

import { RolePermission } from '../entities/role-permission.entity';
import { RolePermissionsRepository } from './role-permissions.repository';

interface MockOrmRepository {
  create: jest.Mock;
  save: jest.Mock;
  findOneBy: jest.Mock;
  findBy: jest.Mock;
  delete: jest.Mock;
}

describe('RolePermissionsRepository', () => {
  let repository: RolePermissionsRepository;
  let ormRepository: MockOrmRepository;

  beforeEach(async () => {
    ormRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      findBy: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolePermissionsRepository,
        {
          provide: getRepositoryToken(RolePermission),
          useValue: ormRepository,
        },
      ],
    }).compile();

    repository = module.get<RolePermissionsRepository>(
      RolePermissionsRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('creates and persists a new role-permission row', async () => {
      const data = { role: Role.ADMIN, permissionId: 'perm-1' };
      const entity = { id: 'rp-1', ...data } as RolePermission;
      ormRepository.create.mockReturnValue(entity);
      ormRepository.save.mockResolvedValue(entity);

      const result = await repository.create(data);

      expect(ormRepository.create).toHaveBeenCalledWith(data);
      expect(ormRepository.save).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });
  });

  describe('findOne', () => {
    it('delegates to the ORM repository by role and permissionId', async () => {
      const rolePermission = { id: 'rp-1' } as RolePermission;
      ormRepository.findOneBy.mockResolvedValue(rolePermission);

      const result = await repository.findOne(Role.ADMIN, 'perm-1');

      expect(ormRepository.findOneBy).toHaveBeenCalledWith({
        role: Role.ADMIN,
        permissionId: 'perm-1',
      });
      expect(result).toBe(rolePermission);
    });
  });

  describe('findByRole', () => {
    it('delegates to the ORM repository by role', async () => {
      const rolePermissions = [{ id: 'rp-1' }] as RolePermission[];
      ormRepository.findBy.mockResolvedValue(rolePermissions);

      const result = await repository.findByRole(Role.ADMIN);

      expect(ormRepository.findBy).toHaveBeenCalledWith({ role: Role.ADMIN });
      expect(result).toBe(rolePermissions);
    });
  });

  describe('delete', () => {
    it('delegates to the ORM repository', async () => {
      await repository.delete('rp-1');

      expect(ormRepository.delete).toHaveBeenCalledWith('rp-1');
    });
  });

  describe('deleteByPermissionId', () => {
    it('delegates to the ORM repository', async () => {
      await repository.deleteByPermissionId('perm-1');

      expect(ormRepository.delete).toHaveBeenCalledWith({
        permissionId: 'perm-1',
      });
    });
  });
});
