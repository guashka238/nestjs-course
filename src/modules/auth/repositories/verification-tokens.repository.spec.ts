import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import {
  VerificationToken,
  VerificationTokenType,
} from '../entities/verification-token.entity';
import { VerificationTokensRepository } from './verification-tokens.repository';

interface MockOrmRepository {
  findOneBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
}

describe('VerificationTokensRepository', () => {
  let repository: VerificationTokensRepository;
  let ormRepository: MockOrmRepository;

  beforeEach(async () => {
    ormRepository = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationTokensRepository,
        {
          provide: getRepositoryToken(VerificationToken),
          useValue: ormRepository,
        },
      ],
    }).compile();

    repository = module.get<VerificationTokensRepository>(
      VerificationTokensRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('creates and persists a new verification token', async () => {
      const data = { userId: 'user-1', tokenHash: 'hash' };
      const entity = { id: 'token-1', ...data } as VerificationToken;
      ormRepository.create.mockReturnValue(entity);
      ormRepository.save.mockResolvedValue(entity);

      const result = await repository.create(data);

      expect(ormRepository.create).toHaveBeenCalledWith(data);
      expect(ormRepository.save).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });
  });

  describe('findByTokenHash', () => {
    it('delegates to the ORM repository by tokenHash and type', async () => {
      const token = { id: 'token-1' } as VerificationToken;
      ormRepository.findOneBy.mockResolvedValue(token);

      const result = await repository.findByTokenHash(
        'hash',
        VerificationTokenType.EMAIL_VERIFICATION,
      );

      expect(ormRepository.findOneBy).toHaveBeenCalledWith({
        tokenHash: 'hash',
        type: VerificationTokenType.EMAIL_VERIFICATION,
      });
      expect(result).toBe(token);
    });
  });

  describe('save', () => {
    it('persists an existing verification token', async () => {
      const token = { id: 'token-1' } as VerificationToken;
      ormRepository.save.mockResolvedValue(token);

      const result = await repository.save(token);

      expect(ormRepository.save).toHaveBeenCalledWith(token);
      expect(result).toBe(token);
    });
  });
});
