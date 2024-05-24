import {JSONSchemaFaker} from 'json-schema-faker';
import {classToJsonSchema} from '../openapi-spec-helper/class.validator';
import {getAllSchemas} from '../openapi-spec-helper/schemas';
import {SchemaObject} from 'openapi3-ts';
import {PaginatedCdrResponse} from '../model/Cdr';
import {PaginatedParams} from '../trigger/param/paginated.params';

export class BaseController {
  generateMockOcpiResponse(model: any): Promise<any> {
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
      const response = JSONSchemaFaker.generate(schema as any);
      return new Promise((resolve) => {
        resolve(response);
      });
    } catch (err) {
      console.log('err', err);
      return new Promise((resolve, reject) => {
        reject(null);
      });
    }
  }

  generateMockOcpiPaginatedResponse = async (model: any, paginationParams?: PaginatedParams): Promise<any> => {
    const response = await this.generateMockOcpiResponse(model) as PaginatedCdrResponse;
    response.limit = paginationParams?.limit;
    response.offset = paginationParams?.offset;
    response.total = 50; // todo for now but will be set
    return response;
  };
}
