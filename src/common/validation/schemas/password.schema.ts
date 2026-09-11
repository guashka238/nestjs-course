import Joi from 'joi';

// Min 8 chars, at least one letter and one digit — a reasonable default
// pending the actual spec — [confirm against spec].
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export const passwordSchema = Joi.string()
  .min(8)
  .max(72)
  .pattern(PASSWORD_PATTERN)
  .messages({
    'string.pattern.base':
      'password must contain at least one letter and one number',
  });
