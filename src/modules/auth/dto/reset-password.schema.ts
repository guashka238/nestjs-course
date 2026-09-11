import Joi from 'joi';

import { passwordSchema } from '@/common/validation/schemas/password.schema';

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

// token format matches the raw token issued in AuthService.forgotPassword
// (randomBytes(32).toString('hex')).
export const resetPasswordSchema = Joi.object<ResetPasswordDto>({
  token: Joi.string().hex().length(64).required(),
  newPassword: passwordSchema.required(),
});
