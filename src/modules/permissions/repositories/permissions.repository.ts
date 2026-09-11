import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Permission } from '../entities/permission.entity';

@Injectable()
export class PermissionsRepository {
  constructor(
    @InjectRepository(Permission)
    private readonly repository: Repository<Permission>,
  ) {}

  create(data: Partial<Permission>): Promise<Permission> {
    return this.repository.save(this.repository.create(data));
  }

  findByName(name: string): Promise<Permission | null> {
    return this.repository.findOneBy({ name });
  }

  findById(id: string): Promise<Permission | null> {
    return this.repository.findOneBy({ id });
  }

  findByIds(ids: string[]): Promise<Permission[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }

    return this.repository.findBy({ id: In(ids) });
  }

  findAll(): Promise<Permission[]> {
    return this.repository.find({ order: { name: 'ASC' } });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
