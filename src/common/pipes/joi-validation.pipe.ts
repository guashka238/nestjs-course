import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { Schema } from 'joi';

@Injectable()
export class JoiValidationPipe<T = unknown> implements PipeTransform<
  unknown,
  T
> {
  // Schema (not ObjectSchema): also used for single-value param/query
  // validation (e.g. a route param against Joi.string().valid(...)), not
  // just request bodies.
  constructor(private readonly schema: Schema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.validate(value, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (result.error) {
      throw new BadRequestException(
        result.error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      );
    }

    return result.value;
  }
}
