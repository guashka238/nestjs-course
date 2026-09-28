import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import type { QueryUsersDto } from '../dto/query-users.schema';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.repository.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOneBy({ email });
  }

  create(data: Partial<User>): Promise<User> {
    return this.repository.save(this.repository.create(data));
  }

  save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  findAll(query: QueryUsersDto): Promise<[User[], number]> {
    const { page, limit, sortBy, sortOrder, email, role, isEmailVerified } =
      query;

    return this.repository.findAndCount({
      where: {
        ...(email ? { email: ILike(`%${email}%`) } : {}),
        ...(role ? { role } : {}),
        ...(isEmailVerified !== undefined ? { isEmailVerified } : {}),
      },
      order: { [sortBy]: sortOrder.toUpperCase() as 'ASC' | 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
