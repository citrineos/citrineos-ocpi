import { JSONSchemaFaker } from 'json-schema-faker';
import { SchemaObject } from 'openapi3-ts';
import { classToJsonSchema } from '../openapi-spec-helper/class.validator';
import { getAllSchemas } from '../openapi-spec-helper/schemas';
import { PaginatedParams } from '../controllers/param/paginated.params';
import { PaginatedCdrResponse } from '../model/Cdr';
import { Service } from 'typedi';

export const generateMockModel = (model: any): any => {
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

export const generateMockOcpiPaginatedResponse = (
  model: any,
  paginationParams?: PaginatedParams,
): any => {
  const response = generateMockModel(model) as PaginatedCdrResponse;
  response.limit = paginationParams?.limit;
  response.offset = paginationParams?.offset;
  response.total = 50; // todo for now but will be set
  return response;
};

@Service()
export class ModelmockService {
  generateMockModel = (model: any): any => generateMockModel(model);
}
