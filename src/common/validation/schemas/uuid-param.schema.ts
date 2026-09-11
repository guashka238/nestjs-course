import Joi from 'joi';

export const uuidParamSchema = Joi.string()
  .guid({ version: 'uuidv4' })
  .required();
