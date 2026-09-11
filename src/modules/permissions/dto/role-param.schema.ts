import Joi from 'joi';

import { Role } from '@/modules/users/entities/user.entity';

export const roleParamSchema = Joi.string()
  .valid(...Object.values(Role))
  .required();
