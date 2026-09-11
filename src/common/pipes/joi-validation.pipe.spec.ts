import { BadRequestException } from '@nestjs/common';
import Joi from 'joi';

import { JoiValidationPipe } from './joi-validation.pipe';

interface Payload {
  email: string;
}

interface FieldError {
  field: string;
  message: string;
}

describe('JoiValidationPipe', () => {
  const schema = Joi.object<Payload>({
    email: Joi.string().email().required(),
  });
  const pipe = new JoiValidationPipe(schema);

  it('returns the validated value when it matches the schema', () => {
    const result = pipe.transform({ email: 'user@example.com' });

    expect(result).toEqual({ email: 'user@example.com' });
  });

  it('strips unknown fields', () => {
    const result = pipe.transform({ email: 'user@example.com', role: 'admin' });

    expect(result).toEqual({ email: 'user@example.com' });
  });

  it('throws BadRequestException with field-level details when invalid', () => {
    expect(() => pipe.transform({ email: 'not-an-email' })).toThrow(
      BadRequestException,
    );

    try {
      pipe.transform({ email: 'not-an-email' });
      throw new Error('expected transform to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        message: FieldError[];
      };
      expect(response.message).toEqual([
        { field: 'email', message: expect.any(String) as string },
      ]);
    }
  });
});
