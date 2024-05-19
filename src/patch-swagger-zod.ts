import { Type } from '@nestjs/common';
import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import type { SchemaObject } from 'openapi3-ts/oas31';
import { SchemaObjectFactory as SchemaObjectFactoryClass } from '@nestjs/swagger/dist/services/schema-object-factory'
import { getZodDTOSchema, isZodDTO, isZodDTOSchema } from './zod-validation';
import { type AnyZodObject, type ZodAny, type ZodArray, type ZodRecord, ZodType, type ZodUnion, ZodTypeAny } from 'zod';
import { ZodOpenApiFullMetadata } from '@asteasolutions/zod-to-openapi/dist/zod-extensions';

function getSchemaObjectFactory(): Type<SchemaObjectFactoryClass> {
  return require('@nestjs/swagger/dist/services/schema-object-factory')
    .SchemaObjectFactory
}

const patchSymbol = Symbol('ZodDtoPatched')

export function patchNestJsSwagger(
  SchemaObjectFactory = getSchemaObjectFactory()
) {
  if (SchemaObjectFactory.prototype[patchSymbol]) {
    return;
  }

  const defaultExplore = SchemaObjectFactory.prototype.exploreModelSchema;

  function registerSchema(schemas: Record<string, SchemaObject>, schema: ZodTypeAny & ZodOpenApiFullMetadata) {
    const generator = new OpenApiGeneratorV3([]);
    const refId = getZodDTOSchema(schema).refId;
    if (!refId) {
      return;
    }
    schemas[refId] = generator['generator'].generateSchemaWithRef(schema.openapi(''));
  }

  function registerSchemaRecursive(schemas: Record<string, SchemaObject>, schema: unknown) {
    if (isZodDTOSchema(schema)) {
      registerSchema(schemas, schema);
    }

    if (schema instanceof ZodType) {
      const type = schema._def.typeName;
      if (type === 'ZodObject') {
        for (const property of Object.values((schema as AnyZodObject)._def.shape())) {
          registerSchemaRecursive(schemas, property);
        }
      } else if (type === 'ZodArray') {
        registerSchemaRecursive(schemas, (schema as ZodArray<ZodAny>)._def.type);
      } else if (type === 'ZodUnion') {
        for (const option of (schema as ZodUnion<[ZodAny]>)._def.options) {
          registerSchemaRecursive(schemas, option);
        }
      } else if (type === 'ZodRecord') {
        registerSchemaRecursive(schemas, (schema as ZodRecord)._def.valueType);
      } else if (type === 'ZodNativeEnum') {
        if (isZodDTOSchema(schema)) {
          registerSchema(schemas, schema);
        }
      }
    }
  }

  SchemaObjectFactory.prototype.exploreModelSchema = function (
    type: Type<unknown> | Function | any,
    schemas: Record<string, SchemaObject>,
    schemaRefsStack: string[] = [],
  ) {
    if (this.isLazyTypeFunc(type)) {
      type = (type as Function)();
    }

    if (!isZodDTO(type)) {
      return defaultExplore.call(this, type, schemas, schemaRefsStack);
    }

    registerSchemaRecursive(schemas, type.schema);

    return type.name;
  };

  SchemaObjectFactory.prototype[patchSymbol] = true;
}
