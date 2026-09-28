import Joi from 'joi';

import type { PaginationQuery } from '@/common/validation/schemas/pagination.schema';
import { paginationSchemaFields } from '@/common/validation/schemas/pagination.schema';
import { Role } from '@/modules/users/entities/user.entity';

export type UsersSortBy = 'createdAt' | 'email' | 'role';
export type SortOrder = 'asc' | 'desc';

export interface QueryUsersDto extends PaginationQuery {
  sortBy: UsersSortBy;
  sortOrder: SortOrder;
  email?: string;
  role?: Role;
  isEmailVerified?: boolean;
}

export const queryUsersSchema = Joi.object<QueryUsersDto>({
  ...paginationSchemaFields,
  sortBy: Joi.string().valid('createdAt', 'email', 'role').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  email: Joi.string().trim().max(255),
  role: Joi.string().valid(...Object.values(Role)),
  isEmailVerified: Joi.boolean(),
});
