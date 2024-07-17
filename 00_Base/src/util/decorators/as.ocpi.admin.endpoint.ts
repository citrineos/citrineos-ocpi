// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { UseBefore } from 'routing-controllers';
import { HttpExceptionHandler } from '../middleware/http.exception.handler';

/**
 * Decorator to add necessary auth and exception handling for "admin" OCPI endpoints
 */
export const AsOcpiAdminEndpoint = function () {
  // TODO add auth as required

  return function (object: any, methodName: string) {
    UseBefore(HttpExceptionHandler)(object, methodName);
  };
};
