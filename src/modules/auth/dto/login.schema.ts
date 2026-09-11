import Joi from 'joi';

export interface LoginDto {
  email: string;
  password: string;
}

export const loginSchema = Joi.object<LoginDto>({
  email: Joi.string().trim().lowercase().email().max(255).required(),
  // No complexity pattern here (unlike registration): login just needs
  // whatever the user's existing password is, not a re-validation of it.
  password: Joi.string().required(),
});
