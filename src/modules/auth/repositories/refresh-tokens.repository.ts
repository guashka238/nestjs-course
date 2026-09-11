import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class RefreshTokensRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repository: Repository<RefreshToken>,
  ) {}

  create(data: Partial<RefreshToken>): Promise<RefreshToken> {
    return this.repository.save(this.repository.create(data));
  }

  findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repository.findOneBy({ tokenHash });
  }

  save(token: RefreshToken): Promise<RefreshToken> {
    return this.repository.save(token);
  }

  async revokeAllActiveForUser(userId: string): Promise<void> {
    await this.repository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}
