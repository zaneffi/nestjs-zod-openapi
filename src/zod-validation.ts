import { ZodOpenAPIInternalMetadata, ZodOpenApiFullMetadata } from '@asteasolutions/zod-to-openapi/dist/zod-extensions';
import { ZodType, ZodTypeDef, z } from 'zod';

const ZodClassSymbol = Symbol('ZodClass');

type ZodClassInternal<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output> = {
  [ZodClassSymbol]: true;
  schema: ZodType<Output, Def, Input>;
  new (): Output;
};

export type ZodClass<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output> = {
  schema: ZodType<Output, Def, Input>;
  new (): Output;
};

export function isZodDTO<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(
  type: unknown,
): type is ZodClassInternal<Output, Def, Input> {
  return !!(type && (type as any)?.[ZodClassSymbol] && isZodDTOSchema((type as ZodClassInternal<Output, Def, Input>).schema));
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

function createZodDto<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(
  schema: ZodType<Output, Def, Input>,
): ZodClass<Output, Def, Input> {
  const clazz = class {};
  Object.defineProperties(clazz, {
    schema: {
      value: schema,
      writable: false,
    },
    [ZodClassSymbol]: {
      value: true,
      writable: false,
    },
  });

  return clazz as ZodClassInternal<Output, Def, Input> as ZodClass<Output, Def, Input>;
};

declare module 'zod' {
  interface ZodType<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output> {
    class<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(this: ZodType<Output, Def, Input>): ZodClass<Output, Def, Input>;
  }
}

export function extendZodWithClass(zod: typeof z) {
  if (typeof zod.ZodType.prototype.class !== 'undefined') {
    // This zod instance is already extended with the required methods,
    // doing it again will just result in multiple wrapper methods for
    // `optional` and `nullable`
    return;
  }

  z.ZodType.prototype.class = function(this): ZodClass<typeof this["_output"], typeof this["_def"], typeof this["_input"]> {
    return createZodDto(this);
  }
}
