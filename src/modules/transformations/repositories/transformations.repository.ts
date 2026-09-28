import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Transformation } from '../entities/transformation.entity';

@Injectable()
export class TransformationsRepository {
  constructor(
    @InjectRepository(Transformation)
    private readonly repository: Repository<Transformation>,
  ) {}

  create(data: Partial<Transformation>): Promise<Transformation> {
    return this.repository.save(this.repository.create(data));
  }
}
