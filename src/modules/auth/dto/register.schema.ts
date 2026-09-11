import Joi from 'joi';

import { passwordSchema } from '@/common/validation/schemas/password.schema';

export interface RegisterDto {
  email: string;
  password: string;
}

export const registerSchema = Joi.object<RegisterDto>({
  email: Joi.string().trim().lowercase().email().max(255).required(),
  password: passwordSchema.required(),
});
