// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Constructable } from 'typedi';
import { ResponseSchema } from '../../openapi-spec-helper';
import { UseAfter } from 'routing-controllers';
import { ResponseValidationMiddleware } from '../middleware/ResponseValidationMiddleware';

export const validatedResponseParam = 'validatedResponseParam';

/**
 * ValidatedResponseSchema decorator wraps {@link ResponseSchema} and adds the input
 * responseClass into Reflect.metadata and enables the {@link ResponseValidationMiddleware}
 * which will get the responseClass via Reflect and perform class-validator validation
 * on the response body prior to sending it back to the client.
 * @param responseClass - response class
 * @param options - {@link ResponseSchema} options
 * @constructor
 */
export const ValidatedResponseSchema = (
  responseClass: Constructable<any>,
  options: {
    contentType?: string;
    description?: string;
    statusCode?: string | number;
    isArray?: boolean;
    examples?: any;
  } = {},
) =>
  function (object: any, methodName: string) {
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
