import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { RefreshToken } from '../entities/refresh-token.entity';
import { RefreshTokensRepository } from './refresh-tokens.repository';

interface MockOrmRepository {
  create: jest.Mock;
  save: jest.Mock;
  findOneBy: jest.Mock;
  update: jest.Mock;
}

describe('RefreshTokensRepository', () => {
  let repository: RefreshTokensRepository;
  let ormRepository: MockOrmRepository;

  beforeEach(async () => {
    ormRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokensRepository,
        { provide: getRepositoryToken(RefreshToken), useValue: ormRepository },
      ],
    }).compile();

    repository = module.get<RefreshTokensRepository>(RefreshTokensRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('creates and persists a new refresh token', async () => {
      const data = { userId: 'user-1', tokenHash: 'hash' };
      const entity = { id: 'token-1', ...data } as RefreshToken;
      ormRepository.create.mockReturnValue(entity);
      ormRepository.save.mockResolvedValue(entity);

      const result = await repository.create(data);

      expect(ormRepository.create).toHaveBeenCalledWith(data);
      expect(ormRepository.save).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });
  });

  describe('findByTokenHash', () => {
    it('delegates to the ORM repository by tokenHash', async () => {
      const token = { id: 'token-1' } as RefreshToken;
      ormRepository.findOneBy.mockResolvedValue(token);

      const result = await repository.findByTokenHash('hash');

      expect(ormRepository.findOneBy).toHaveBeenCalledWith({
        tokenHash: 'hash',
      });
      expect(result).toBe(token);
    });
  });

  describe('save', () => {
    it('persists an existing refresh token', async () => {
      const token = { id: 'token-1' } as RefreshToken;
      ormRepository.save.mockResolvedValue(token);

      const result = await repository.save(token);

      expect(ormRepository.save).toHaveBeenCalledWith(token);
      expect(result).toBe(token);
    });
  });

  describe('revokeAllActiveForUser', () => {
    it('bulk-revokes only the active tokens for that user', async () => {
      await repository.revokeAllActiveForUser('user-1');

      expect(ormRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1', revokedAt: expect.anything() as object },
        { revokedAt: expect.any(Date) as Date },
      );
    });
  });
});
