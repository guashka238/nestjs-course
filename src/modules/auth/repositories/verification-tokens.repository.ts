import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  VerificationToken,
  VerificationTokenType,
} from '../entities/verification-token.entity';

@Injectable()
export class VerificationTokensRepository {
  constructor(
    @InjectRepository(VerificationToken)
    private readonly repository: Repository<VerificationToken>,
  ) {}

  create(data: Partial<VerificationToken>): Promise<VerificationToken> {
    return this.repository.save(this.repository.create(data));
  }

  findByTokenHash(
    tokenHash: string,
    type: VerificationTokenType,
  ): Promise<VerificationToken | null> {
    return this.repository.findOneBy({ tokenHash, type });
  }

  save(token: VerificationToken): Promise<VerificationToken> {
    return this.repository.save(token);
  }
}
