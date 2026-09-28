import Joi from 'joi';

export interface PaginationQuery {
  page: number;
  limit: number;
}

// Spread into a module's own Joi.object({...}) alongside its filter/sort keys.
export const paginationSchemaFields = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};
