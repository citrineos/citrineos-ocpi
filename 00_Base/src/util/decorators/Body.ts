import { Body as RcBody } from 'routing-controllers';
import { ZodTypeAny } from 'zod';

export const BODY_PARAM = 'BodyParam';
export const Body = (schema: ZodTypeAny, name: string) =>
  function (object: NonNullable<unknown>, methodName: string, index: number) {
    // Apply the standard @Params() decorator
    RcBody()(object, methodName, index);

    // Add custom metadata for additional use cases
    Reflect.defineMetadata(
      BODY_PARAM,
      {
        schema,
        name,
      },
      object,
      `${methodName}.${index}`,
    );
  };
