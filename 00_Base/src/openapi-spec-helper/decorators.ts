import {
  OperationObject,
  ReferenceObject,
  ResponsesObject,
  SchemaObject,
} from 'openapi3-ts';
import 'reflect-metadata';
import { IRoute } from './parse.metadata';
import { getContentType, getStatusCode } from './generate.spec.helpers';
import { mergeDeep } from './merge.deep';
import { SchemaStore } from './schema.store';
import { Constructable } from 'typedi';

const OPEN_API_KEY = Symbol('routing-controllers-openapi:OpenAPI');

export type OpenAPIParam =
  | Partial<OperationObject>
  | ((source: OperationObject, route: IRoute) => OperationObject);

/**
 * Get the OpenAPI Operation object stored in given target property's metadata.
 */
export function getOpenAPIMetadata(
  target: object,
  key?: string,
): OpenAPIParam[] {
  return (
    (key
      ? Reflect.getMetadata(OPEN_API_KEY, target.constructor, key)
      : Reflect.getMetadata(OPEN_API_KEY, target)) || []
  );
}

/**
 * Store given OpenAPI Operation object into target property's metadata.
 */
export function setOpenAPIMetadata(
  value: OpenAPIParam[],
  target: object,
  key?: string,
) {
  return key
    ? Reflect.defineMetadata(OPEN_API_KEY, value, target.constructor, key)
    : Reflect.defineMetadata(OPEN_API_KEY, value, target);
}

/**
 * Supplement action with additional OpenAPI Operation keywords.
 *
 * @param spec OpenAPI Operation object that is merged into the schema derived
 * from routing-controllers decorators. In case of conflicts, keywords defined
 * here overwrite the existing ones. Alternatively you can supply a function
 * that receives as parameters the existing Operation and target route,
 * returning an updated Operation.
 */
export function OpenAPI(spec: OpenAPIParam) {
  return (...args: [any] | [object, string, PropertyDescriptor]) => {
    if (args.length === 1) {
      const [target] = args;
      const currentMeta = getOpenAPIMetadata(target);
      setOpenAPIMetadata([spec, ...currentMeta], target);
    } else {
      const [target, key] = args;
      const currentMeta = getOpenAPIMetadata(target, key);
      setOpenAPIMetadata([spec, ...currentMeta], target, key);
    }
  };
}

/**
 * Apply the keywords defined in @OpenAPI decorator to its target route.
 */
export function applyOpenAPIDecorator(
  originalOperation: OperationObject,
  route: IRoute,
): OperationObject {
  const { action } = route;
  const openAPIParams = [
    ...getOpenAPIMetadata(action.target),
    ...getOpenAPIMetadata(action.target.prototype, action.method),
  ];

  return openAPIParams.reduce(
    (acc: OperationObject, oaParam: OpenAPIParam) =>
      typeof oaParam === 'function'
        ? oaParam(acc, route)
        : mergeDeep({}, acc, oaParam),
    originalOperation,
  ) as OperationObject;
}

/**
 * Supplement action with response body type annotation.
 */
export function ResponseSchema(
  responseClass: Constructable<any>,
  options: {
    contentType?: string;
    description?: string;
    statusCode?: string | number;
    isArray?: boolean;
    examples?: any;
  } = {},
) {
  const setResponseSchema = (source: OperationObject, route: IRoute) => {
    const contentType = options.contentType || getContentType(route);
    const description = options.description || '';
    const isArray = options.isArray || false;
    const statusCode = (options.statusCode || getStatusCode(route)) + '';

    let responseSchemaName = '';
    if (typeof responseClass === 'function' && responseClass.name) {
      SchemaStore.addToSchemaStore(responseClass as Constructable<any>);
      responseSchemaName = responseClass.name;
    } else if (typeof responseClass === 'string') {
      responseSchemaName = responseClass;
    }

    if (responseSchemaName) {
      const reference: ReferenceObject = {
        $ref: `#/components/schemas/${responseSchemaName}`,
      };
      const schema: SchemaObject | ReferenceObject = isArray
        ? { items: reference, type: 'array' }
        : reference;

      const content = {
        [contentType]: {
          schema,
        },
      };
      if (options.examples) {
        (content[contentType] as any).examples = options.examples;
      }
      const responses: ResponsesObject = {
        [statusCode]: {
          content,
          description,
        },
      };

      const oldSchema =
        source.responses[statusCode]?.content[contentType].schema;

      if (
        oldSchema &&
        (oldSchema?.$ref || oldSchema?.items || oldSchema?.oneOf)
      ) {
        // case where we're adding multiple schemas under single statuscode/contentType
        const newStatusCodeResponse = mergeDeep(
          {},
          source.responses[statusCode],
          responses[statusCode],
        );
        const newSchema = oldSchema.oneOf
          ? {
              oneOf: [...oldSchema.oneOf, schema],
            }
          : { oneOf: [oldSchema, schema] };

        newStatusCodeResponse.content[contentType].schema = newSchema;
        source.responses[statusCode] = newStatusCodeResponse;
        return source;
      }

      return mergeDeep({}, source, { responses });
    }

    return source;
  };

  return OpenAPI(setResponseSchema);
}
