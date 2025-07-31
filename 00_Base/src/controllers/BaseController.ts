import { JSONSchemaFaker } from 'json-schema-faker';
import { getAllSchemas } from '../openapi-spec-helper/schemas';
import { PaginatedCdrResponse } from '../model/Cdr';
import { PaginatedParams } from './param/PaginatedParams';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const generateMockOcpiResponse = (model: any, name: string): any => {
  (JSONSchemaFaker.format as any)('url', (url: any) => url);
  JSONSchemaFaker.option({
    useExamplesValue: true,
    useDefaultValue: true,
  });

  const schema: any = zodToJsonSchema(model, name);
  (schema as any).components = {
    schemas: getAllSchemas(),
  };
  try {
    return JSONSchemaFaker.generate(schema);
  } catch (err) {
    console.log('err', err);
    return null;
  }
};

export const generateMockOcpiPaginatedResponse = (
  schema: any,
  name: string,
  paginationParams?: PaginatedParams,
): any => {
  const response = generateMockOcpiResponse(
    schema,
    name,
  ) as PaginatedCdrResponse;
  response.limit = paginationParams?.limit || DEFAULT_LIMIT;
  response.offset = paginationParams?.offset || DEFAULT_OFFSET;
  response.total = 50; // todo for now but will be set
  return response;
};

export class BaseController {
  generateMockOcpiResponse = (model: any, name: string): any =>
    generateMockOcpiResponse(model, name);
  generateMockOcpiPaginatedResponse = (
    model: any,
    name: string,
    paginationParams?: PaginatedParams,
  ): any => generateMockOcpiPaginatedResponse(model, name, paginationParams);
}
