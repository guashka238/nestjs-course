import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RefreshTokensRepository } from '@/modules/auth/repositories/refresh-tokens.repository';

import type { UpdateUserDto } from './dto/update-user.schema';
import { User } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshTokensRepository: RefreshTokensRepository,
  ) {}

  listUsers(): Promise<User[]> {
    return this.usersRepository.findAll();
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
