import { ZodTypeAny } from 'zod';
import { Body } from './Body';
import { generateMockForSchema } from '../../controllers/BaseController';

export const BODY_WITH_EXAMPLE_PARAM = 'BodyWithExample';

export const BodyWithExample = (schema: ZodTypeAny, name: string) =>
  function (object: NonNullable<unknown>, methodName: string, index: number) {
    const example = generateMockForSchema(schema, name);
    Body(schema, name)(object, methodName, index);

    // Add custom metadata for additional use cases
    Reflect.defineMetadata(
      BODY_WITH_EXAMPLE_PARAM,
      example,
      object,
      methodName,
    );
  };
