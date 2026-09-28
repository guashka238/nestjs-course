import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Transformation } from '../entities/transformation.entity';
import { TransformationsRepository } from './transformations.repository';

describe('TransformationsRepository', () => {
  let repository: TransformationsRepository;
  let ormRepository: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransformationsRepository,
        {
          provide: getRepositoryToken(Transformation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<TransformationsRepository>(
      TransformationsRepository,
    );
    ormRepository = module.get(getRepositoryToken(Transformation));
  });

  describe('create', () => {
    it('creates and persists a new transformation record', async () => {
      const data = { userId: 'user-1' };
      const entity = { id: 'tx-1', ...data } as Transformation;
      ormRepository.create.mockReturnValue(entity);
      ormRepository.save.mockResolvedValue(entity);

      const result = await repository.create(data);

      expect(ormRepository.create).toHaveBeenCalledWith(data);
      expect(ormRepository.save).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });
  });
});
