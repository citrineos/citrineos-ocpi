// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Constructable } from 'typedi';
import { ResponseSchema } from '../../openapi-spec-helper';
import { UseAfter } from 'routing-controllers';
import { ResponseValidationMiddleware } from '../middleware/ResponseValidationMiddleware';

export const validatedResponseParam = 'validatedResponseParam';

export const ValidatedResponseSchema = (
  responseClass: Constructable<any>,
  options: {
    contentType?: string;
    description?: string;
    statusCode?: string | number;
    isArray?: boolean;
    examples?: any;
  } = {},
) => {
  return function (object: any, methodName: string) {
    // reuse original
    ResponseSchema(responseClass, options)(
      object as any,
      methodName as any,
      {} as any,
    );

    // Add custom metadata for additional use cases
    Reflect.defineMetadata(
      validatedResponseParam,
      responseClass,
      object,
      methodName,
    );

    // apply middleware
    UseAfter(ResponseValidationMiddleware)(object, methodName);
  };
};
