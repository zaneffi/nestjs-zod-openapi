import { extendZodWithClass, type CreateZodDtoOptions } from './zod-validation';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { patchNestJsSwagger } from './patch-swagger-zod';
import { z } from 'zod';

extendZodWithOpenApi(z);
extendZodWithClass(z);
patchNestJsSwagger();

export { ZodClass } from './zod-validation';
export { ZodValidationPipe } from './zod-validation.pipe';
export type { CreateZodDtoOptions };

export { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';
