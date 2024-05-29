import {JSONSchemaFaker} from 'json-schema-faker';
import {classToJsonSchema} from '../openapi-spec-helper/class.validator';
import {getAllSchemas} from '../openapi-spec-helper/schemas';
import {SchemaObject} from 'openapi3-ts';
import {PaginatedCdrResponse} from '../model/Cdr';
import {PaginatedParams} from './param/paginated.params';

export const generateMockOcpiResponse = (model: any): any => {
  (JSONSchemaFaker.format as any)('url', (url: any) => url);
  JSONSchemaFaker.option({
    useExamplesValue: true,
    useDefaultValue: true,
  });
  const schema: SchemaObject = classToJsonSchema(model);
  (schema as any).components = {
    schemas: getAllSchemas(),
  };
  try {
    return JSONSchemaFaker.generate(schema as any);
  } catch (err) {
    console.log('err', err);
    return null;
  }
};

export const generateMockOcpiPaginatedResponse = (model: any, paginationParams?: PaginatedParams): any => {
  const response = generateMockOcpiResponse(model) as PaginatedCdrResponse;
  response.limit = paginationParams?.limit;
  response.offset = paginationParams?.offset;
  response.total = 50; // todo for now but will be set
  return response;
}

export class BaseController {
  generateMockOcpiResponse = (model: any): any => generateMockOcpiResponse(model);
  generateMockOcpiPaginatedResponse = (model: any, paginationParams?: PaginatedParams): any => generateMockOcpiPaginatedResponse(model, paginationParams);
}
