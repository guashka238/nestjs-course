import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Role, User } from '../entities/user.entity';
import { UsersRepository } from './users.repository';

interface MockOrmRepository {
  findOneBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  softDelete: jest.Mock;
  findAndCount: jest.Mock;
}

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let ormRepository: MockOrmRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
    ormRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('delegates to the ORM repository by id', async () => {
      const user = { id: 'user-1' } as User;
      ormRepository.findOneBy.mockResolvedValue(user);

      const result = await repository.findById('user-1');

      expect(ormRepository.findOneBy).toHaveBeenCalledWith({ id: 'user-1' });
      expect(result).toBe(user);
    });
  });

  describe('findByEmail', () => {
    it('delegates to the ORM repository by email', async () => {
      const user = { id: 'user-1', email: 'user@example.com' } as User;
      ormRepository.findOneBy.mockResolvedValue(user);

      const result = await repository.findByEmail('user@example.com');

      expect(ormRepository.findOneBy).toHaveBeenCalledWith({
        email: 'user@example.com',
      });
      expect(result).toBe(user);
    });
  });

  describe('create', () => {
    it('creates and persists a new user', async () => {
      const data = { email: 'user@example.com' };
      const entity = { id: 'user-1', ...data } as User;
      ormRepository.create.mockReturnValue(entity);
      ormRepository.save.mockResolvedValue(entity);

      const result = await repository.create(data);

      expect(ormRepository.create).toHaveBeenCalledWith(data);
      expect(ormRepository.save).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });
  });

  describe('save', () => {
    it('persists an existing user', async () => {
      const user = { id: 'user-1' } as User;
      ormRepository.save.mockResolvedValue(user);

      const result = await repository.save(user);

      expect(ormRepository.save).toHaveBeenCalledWith(user);
      expect(result).toBe(user);
    });
  });

  describe('softDelete', () => {
    it('soft-deletes a user by id', async () => {
      await repository.softDelete('user-1');

      expect(ormRepository.softDelete).toHaveBeenCalledWith('user-1');
    });
  });

  describe('findAll', () => {
    it('paginates, sorts and returns the total count', async () => {
      const users = [{ id: 'user-1' }] as User[];
      ormRepository.findAndCount.mockResolvedValue([users, 1]);

      const result = await repository.findAll({
        page: 2,
        limit: 10,
        sortBy: 'email',
        sortOrder: 'asc',
      });

      expect(ormRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { email: 'ASC' },
        skip: 10,
        take: 10,
      });
      expect(result).toEqual([users, 1]);
    });

    it('applies email, role and isEmailVerified filters when provided', async () => {
      ormRepository.findAndCount.mockResolvedValue([[], 0]);

      await repository.findAll({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        email: 'ali',
        role: Role.ADMIN,
        isEmailVerified: true,
      });

      expect(ormRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            email: expect.any(Object) as object,
            role: Role.ADMIN,
            isEmailVerified: true,
          },
        }),
      );
    });
  });
});
