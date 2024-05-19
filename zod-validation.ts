import { ZodOpenAPIInternalMetadata, ZodOpenApiFullMetadata } from '@asteasolutions/zod-to-openapi/dist/zod-extensions';
import { PipeTransform, ArgumentMetadata, BadRequestException, Logger } from '@nestjs/common';
import { ZodObject, ZodType, ZodTypeDef, z } from 'zod';

const ZodClassSymbol = Symbol('ZodClass');

export type ZodClass<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output> = {
  [ZodClassSymbol]: true;
  schema: ZodType<Output, Def, Input>;
  new (): Output;
};

export function isZodDTO<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(
  type: unknown,
): type is ZodClass<Output, Def, Input> {
  return isZodDTOSchema((type as any)?.schema);
};

export function isZodDTOSchema<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(
  type: unknown,
): type is ZodType<Output, Def, Input> {
  return !!(type as ZodType)?._def?.openapi?._internal;
}

export function getZodDTOSchema<Output = any>(
  type: ZodOpenApiFullMetadata<Output>,
): ZodOpenAPIInternalMetadata;
export function getZodDTOSchema<Output = any>(
  type: unknown,
): undefined;
export function getZodDTOSchema<Output = any>(
  type: ZodOpenApiFullMetadata<Output> | unknown,
): ZodOpenAPIInternalMetadata | undefined {
  return isZodDTOSchema(type) ? (type as ZodType)?._def?.openapi?._internal : undefined;
}

interface CreateZodDtoOptions {
  strict?: boolean;
}

function createZodDto<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(
  schema: ZodType<Output, Def, Input>,
  options?: CreateZodDtoOptions,
): ZodClass<Output, Def, Input> {
  // always force strict objects unless explicitly set to false
  let finalSchema = schema;
  if (options?.strict !== false && schema instanceof ZodObject) {
    finalSchema = schema.strict() as never;
  }

  const clazz = class {};
  Object.defineProperties(clazz, {
    schema: {
      value: finalSchema,
      writable: false,
    },
    [ZodClassSymbol]: {
      value: true,
      writable: false,
    },
  });

  return clazz as never;
};

export class ZodValidationPipe implements PipeTransform {
  private logger = new Logger(ZodValidationPipe.name);

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
      if (error instanceof z.ZodError) {
        throw new BadRequestException(error.errors);
      }

      this.logger.error('Unknown validation error', error);
      throw new BadRequestException('Validation failed');
    }
  }

  private getSchema(metadata: ArgumentMetadata): ZodType | null {
    const { metatype } = metadata;
    return isZodDTO(metatype) ? metatype.schema : null;
  }
}

declare module 'zod' {
  interface ZodType<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output> {
    class<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(this: ZodType<Output, Def, Input>): ZodClass<Output, Def, Input>;
    class<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(this: ZodType<Output, Def, Input>, options: CreateZodDtoOptions): ZodClass<Output, Def, Input>;
  }
}

export function extendZodWithClass(zod: typeof z) {
  if (typeof zod.ZodType.prototype.class !== 'undefined') {
    // This zod instance is already extended with the required methods,
    // doing it again will just result in multiple wrapper methods for
    // `optional` and `nullable`
    return;
  }

  z.ZodType.prototype.class = function(options?: CreateZodDtoOptions) {
    return createZodDto(this, options);
  }
}
