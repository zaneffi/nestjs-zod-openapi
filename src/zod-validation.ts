import { ZodOpenAPIInternalMetadata, ZodOpenApiFullMetadata } from '@asteasolutions/zod-to-openapi/dist/zod-extensions';
import { ZodObject, ZodType, ZodTypeDef, z } from 'zod';

export abstract class ZodClass<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output> {
  readonly name!: string;
  schema!: ZodType<Output, Def, Input>;
}

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

export interface CreateZodDtoOptions {
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
  });

  return clazz as never;
};

declare module 'zod' {
  interface ZodType<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output> {
    class<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(this: ZodType<Output, Def, Input>): typeof ZodClass<Output, Def, Input>;
    class<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(this: ZodType<Output, Def, Input>, options: CreateZodDtoOptions): typeof ZodClass<Output, Def, Input>;
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
    return createZodDto(this, options) as never;
  }
}
