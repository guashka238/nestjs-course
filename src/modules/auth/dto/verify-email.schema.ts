import Joi from 'joi';

export interface VerifyEmailDto {
  token: string;
}

// Matches the raw token format issued in AuthService.register (randomBytes(32).toString('hex')).
export const verifyEmailSchema = Joi.object<VerifyEmailDto>({
  token: Joi.string().hex().length(64).required(),
});
