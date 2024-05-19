import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError, type ZodType } from 'zod';
import { isZodDTO } from './zod-validation';

export class ZodValidationPipe implements PipeTransform {
  constructor() {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const schema = this.getSchema(metadata);
      if (!schema) {
        // No schema, no validation
        return value;
      }
      const parsedValue = schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.errors);
      }

      throw new BadRequestException('Validation failed');
    }
  }

  private getSchema(metadata: ArgumentMetadata): ZodType | null {
    const { metatype } = metadata;

    return isZodDTO(metatype) ? metatype.schema : null;
  }
}
