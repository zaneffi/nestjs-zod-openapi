import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { extendZodWithClass } from './zod-validation';
import { patchNestJsSwagger } from './patch-swagger-zod';
import { z } from 'zod';

extendZodWithOpenApi(z);
extendZodWithClass(z);
patchNestJsSwagger();

export { ZodValidationPipe } from './zod-validation.pipe';
export {} from './zod-validation';
export { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi'
