import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { RefreshTokensRepository } from '@/modules/auth/repositories/refresh-tokens.repository';

import { Role, User } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: {
    findAll: jest.Mock;
    findById: jest.Mock;
    save: jest.Mock;
    softDelete: jest.Mock;
  };
  let refreshTokensRepository: { revokeAllActiveForUser: jest.Mock };

  const user: User = {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hashed',
    role: Role.USER,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    usersRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
    };
    refreshTokensRepository = { revokeAllActiveForUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: RefreshTokensRepository, useValue: refreshTokensRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('listUsers', () => {
    it('delegates to the repository', async () => {
      usersRepository.findAll.mockResolvedValue([user]);

      const result = await service.listUsers();

      expect(result).toEqual([user]);
    });
  });

  describe('getUser', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.getUser('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the user when found', async () => {
      usersRepository.findById.mockResolvedValue(user);

      await expect(service.getUser('user-1')).resolves.toBe(user);
    });
  });

  describe('updateUser', () => {
    it('updates only the provided fields', async () => {
      usersRepository.findById.mockResolvedValue({ ...user });
      usersRepository.save.mockImplementation((u: User) => Promise.resolve(u));

      const result = await service.updateUser('user-1', { role: Role.ADMIN });

      expect(result.role).toBe(Role.ADMIN);
      expect(result.isEmailVerified).toBe(true);
    });
  });

  describe('deleteUser', () => {
    it('throws BadRequestException when deleting your own account', async () => {
      await expect(
        service.deleteUser('user-1', 'user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersRepository.softDelete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the target user does not exist', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteUser('missing', 'admin-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(usersRepository.softDelete).not.toHaveBeenCalled();
    });

    it('soft-deletes the user and revokes their active sessions', async () => {
      usersRepository.findById.mockResolvedValue(user);

      await service.deleteUser('user-1', 'admin-1');

      expect(usersRepository.softDelete).toHaveBeenCalledWith('user-1');
      expect(
        refreshTokensRepository.revokeAllActiveForUser,
      ).toHaveBeenCalledWith('user-1');
    });
  });
});
