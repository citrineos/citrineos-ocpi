import {QueryParam} from 'routing-controllers';

export const ENUM_QUERY_PARAM = 'EnumQueryParam';


export const EnumQueryParam = (name: string, enumType: any, enumName: string) =>
  function (object: NonNullable<unknown>, methodName: string, index: number) {

    QueryParam(name)(object, methodName, index);

    // Add custom metadata for additional use cases
    Reflect.defineMetadata(
      ENUM_QUERY_PARAM,
      enumName,
      object,
      `${methodName}.${name}`,
    );
  };
