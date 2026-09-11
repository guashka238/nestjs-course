import Joi from 'joi';

export interface AssignPermissionDto {
  permissionId: string;
}

export const assignPermissionSchema = Joi.object<AssignPermissionDto>({
  permissionId: Joi.string().guid({ version: 'uuidv4' }).required(),
});
