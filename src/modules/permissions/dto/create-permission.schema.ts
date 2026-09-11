import Joi from 'joi';

export interface CreatePermissionDto {
  name: string;
  description?: string;
}

// "resource:action" convention (e.g. "users:read") — a reasonable default
// pending the actual RBAC spec — [confirm against spec].
const PERMISSION_NAME_PATTERN = /^[a-z0-9_]+:[a-z0-9_]+$/;

export const createPermissionSchema = Joi.object<CreatePermissionDto>({
  name: Joi.string()
    .trim()
    .lowercase()
    .max(100)
    .pattern(PERMISSION_NAME_PATTERN)
    .required()
    .messages({
      'string.pattern.base':
        'name must follow the "resource:action" convention, e.g. "users:read"',
    }),
  description: Joi.string().trim().max(255).optional(),
});
