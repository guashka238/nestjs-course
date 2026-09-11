import Joi from 'joi';

import { Role } from '@/modules/users/entities/user.entity';

export interface UpdateUserDto {
  role?: Role;
  isEmailVerified?: boolean;
}

// Deliberately narrow: email/password changes go through the auth flows
// (register/reset-password) rather than this admin-management endpoint.
export const updateUserSchema = Joi.object<UpdateUserDto>({
  role: Joi.string().valid(...Object.values(Role)),
  isEmailVerified: Joi.boolean(),
})
  .min(1)
  .messages({
    'object.min': 'at least one field (role, isEmailVerified) must be provided',
  });
