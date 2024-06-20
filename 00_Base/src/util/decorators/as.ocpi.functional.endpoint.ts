// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { HeaderParam, UseBefore } from 'routing-controllers';
import { ParamOptions } from 'routing-controllers';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { OcpiHttpHeader } from '../ocpi.http.header';
import { OcpiHeaderMiddleware } from '../middleware/ocpi.header.middleware';
import { UniqueMessageIdsMiddleware } from '../middleware/unique.message.ids.middleware';
import { HttpHeader } from '@citrineos/base';

export const uniqueMessageIdHeaders = {
  [OcpiHttpHeader.XRequestId]: { required: true },
  [OcpiHttpHeader.XCorrelationId]: { required: true },
};

/**
 * Decorator for to inject OCPI headers and apply {@link AuthMiddleware}, {@link OcpiHeaderMiddleware} and
 * {@link UniqueMessageIdsMiddleware} on the endpoint
 */
export const AsOcpiFunctionalEndpoint = function () {
  const headers: { [key: string]: ParamOptions } = {
    [HttpHeader.Authorization]: { required: true },
    [OcpiHttpHeader.OcpiFromCountryCode]: { required: true },
    [OcpiHttpHeader.OcpiFromPartyId]: { required: true },
    [OcpiHttpHeader.OcpiToCountryCode]: { required: true },
    [OcpiHttpHeader.OcpiToPartyId]: { required: true },
    ...uniqueMessageIdHeaders,
  };
  return function (object: any, methodName: string) {
    for (const [key, options] of Object.entries(headers)) {
      HeaderParam(key, options)(object, methodName);
    }
    UseBefore(AuthMiddleware)(object, methodName);
    UseBefore(OcpiHeaderMiddleware)(object, methodName);
    UseBefore(UniqueMessageIdsMiddleware)(object, methodName);
  };
};
