import Joi from 'joi';

export interface ForgotPasswordDto {
  email: string;
}

export const forgotPasswordSchema = Joi.object<ForgotPasswordDto>({
  email: Joi.string().trim().lowercase().email().max(255).required(),
});
