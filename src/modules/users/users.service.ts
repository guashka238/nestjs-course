import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { PaginatedResult } from '@/common/types/paginated-result';
import { RefreshTokensRepository } from '@/modules/auth/repositories/refresh-tokens.repository';

import type { QueryUsersDto } from './dto/query-users.schema';
import type { UpdateUserDto } from './dto/update-user.schema';
import { User } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshTokensRepository: RefreshTokensRepository,
  ) {}

  async listUsers(query: QueryUsersDto): Promise<PaginatedResult<User>> {
    const [items, total] = await this.usersRepository.findAll(query);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async getUser(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.getUser(id);

    if (dto.role !== undefined) {
      user.role = dto.role;
    }
    if (dto.isEmailVerified !== undefined) {
      user.isEmailVerified = dto.isEmailVerified;
    }

    return this.usersRepository.save(user);
  }

  async deleteUser(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw new BadRequestException(
        'Cannot delete your own account via this endpoint',
      );
    }

    await this.getUser(id);

    await this.usersRepository.softDelete(id);
    // A deleted account shouldn't leave usable sessions behind.
    await this.refreshTokensRepository.revokeAllActiveForUser(id);
  }
}
