import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Permission } from '../entities/permission.entity';
import { PermissionsRepository } from './permissions.repository';

interface MockOrmRepository {
  create: jest.Mock;
  save: jest.Mock;
  findOneBy: jest.Mock;
  findBy: jest.Mock;
  find: jest.Mock;
  delete: jest.Mock;
}

describe('PermissionsRepository', () => {
  let repository: PermissionsRepository;
  let ormRepository: MockOrmRepository;

  beforeEach(async () => {
    ormRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      findBy: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsRepository,
        { provide: getRepositoryToken(Permission), useValue: ormRepository },
      ],
    }).compile();

    repository = module.get<PermissionsRepository>(PermissionsRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('creates and persists a new permission', async () => {
      const data = { name: 'users:read' };
      const entity = { id: 'perm-1', ...data } as Permission;
      ormRepository.create.mockReturnValue(entity);
      ormRepository.save.mockResolvedValue(entity);

      const result = await repository.create(data);

      expect(ormRepository.create).toHaveBeenCalledWith(data);
      expect(ormRepository.save).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });
  });

  describe('findByName', () => {
    it('delegates to the ORM repository by name', async () => {
      const permission = { id: 'perm-1' } as Permission;
      ormRepository.findOneBy.mockResolvedValue(permission);

      const result = await repository.findByName('users:read');

      expect(ormRepository.findOneBy).toHaveBeenCalledWith({
        name: 'users:read',
      });
      expect(result).toBe(permission);
    });
  });

  describe('findById', () => {
    it('delegates to the ORM repository by id', async () => {
      const permission = { id: 'perm-1' } as Permission;
      ormRepository.findOneBy.mockResolvedValue(permission);

      const result = await repository.findById('perm-1');

      expect(ormRepository.findOneBy).toHaveBeenCalledWith({ id: 'perm-1' });
      expect(result).toBe(permission);
    });
  });

  describe('findByIds', () => {
    it('returns an empty array without querying when given no ids', async () => {
      const result = await repository.findByIds([]);

      expect(ormRepository.findBy).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('delegates to the ORM repository for a non-empty id list', async () => {
      const permissions = [{ id: 'perm-1' }] as Permission[];
      ormRepository.findBy.mockResolvedValue(permissions);

      const result = await repository.findByIds(['perm-1']);

      expect(ormRepository.findBy).toHaveBeenCalled();
      expect(result).toBe(permissions);
    });
  });

  describe('findAll', () => {
    it('returns all permissions ordered by name', async () => {
      const permissions = [{ id: 'perm-1' }] as Permission[];
      ormRepository.find.mockResolvedValue(permissions);

      const result = await repository.findAll();

      expect(ormRepository.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
      expect(result).toBe(permissions);
    });
  });

  describe('delete', () => {
    it('delegates to the ORM repository', async () => {
      await repository.delete('perm-1');

      expect(ormRepository.delete).toHaveBeenCalledWith('perm-1');
    });
  });
});
