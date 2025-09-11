// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { JSONSchemaFaker } from 'json-schema-faker';
import { getAllSchemas } from '../openapi-spec-helper/schemas';
import { PaginatedCdrResponse } from '../model/Cdr';
import { PaginatedParams } from './param/PaginatedParams';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ZodTypeAny } from 'zod';
import Container from 'typedi';
import { Logger } from 'tslog';

export const generateMockForSchema = (
  schema: ZodTypeAny,
  name: string,
): any => {
  (JSONSchemaFaker.format as any)('url', (url: any) => url);
  JSONSchemaFaker.option({
    useExamplesValue: true,
    useDefaultValue: true,
  });

  const jsonSchema: any = zodToJsonSchema(schema, name);
  (jsonSchema as any).components = {
    schemas: getAllSchemas(),
  };
  try {
    return JSONSchemaFaker.generate(jsonSchema);
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
  const response = generateMockForSchema(schema, name) as PaginatedCdrResponse;
  response.limit = paginationParams?.limit || DEFAULT_LIMIT;
  response.offset = paginationParams?.offset || DEFAULT_OFFSET;
  response.total = 50; // todo for now but will be set
  return response;
};

export class BaseController {
  protected logger = Container.get(Logger);
  generateMockOcpiResponse = (model: any, name: string): any =>
    generateMockForSchema(model, name);
  generateMockOcpiPaginatedResponse = (
    model: any,
    name: string,
    paginationParams?: PaginatedParams,
  ): any => generateMockOcpiPaginatedResponse(model, name, paginationParams);
}
