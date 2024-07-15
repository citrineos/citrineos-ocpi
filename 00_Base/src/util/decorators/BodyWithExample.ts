import { Body } from 'routing-controllers';

export const BODY_WITH_EXAMPLE_PARAM = 'BodyWithExample';

export const BodyWithExample = (example: any) =>
  function (object: NonNullable<unknown>, methodName: string, index: number) {
    Body()(object, methodName, index);

    // Add custom metadata for additional use cases
    Reflect.defineMetadata(
      BODY_WITH_EXAMPLE_PARAM,
      example,
      object,
      methodName,
    );
  };
