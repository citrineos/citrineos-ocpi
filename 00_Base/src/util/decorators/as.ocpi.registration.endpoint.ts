// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { HeaderParam, ParamOptions, UseBefore } from 'routing-controllers';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { UniqueMessageIdsMiddleware } from '../middleware/unique.message.ids.middleware';
import { HttpHeader } from '@citrineos/base';
import { uniqueMessageIdHeaders } from './as.ocpi.functional.endpoint';
import { OcpiExceptionHandler } from '../middleware/ocpi.exception.handler';

/**
 * Decorator for to inject OCPI headers and apply {@link AuthMiddleware} and {@link UniqueMessageIdsMiddleware}
 * on the endpoint
 */
export const AsOcpiRegistrationEndpoint = function () {
  const headers: { [key: string]: ParamOptions } = {
    [HttpHeader.Authorization]: { required: true },
    ...uniqueMessageIdHeaders,
  };
  return function (object: any, methodName: string) {
    for (const [key, options] of Object.entries(headers)) {
      HeaderParam(key, options)(object, methodName);
    }
    UseBefore(AuthMiddleware)(object, methodName);
    UseBefore(UniqueMessageIdsMiddleware)(object, methodName);
    UseBefore(OcpiExceptionHandler)(object, methodName);
  };
};
