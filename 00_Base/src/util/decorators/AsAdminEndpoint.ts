// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { UseBefore } from 'routing-controllers';
import { HttpExceptionHandler } from '../middleware/HttpExceptionHandler';
import { AdminAuthMiddleware } from '../middleware/AdminAuthMiddleware';

/**
 * Decorator to add necessary auth and exception handling for "admin" OCPI endpoints
 */
export const AsAdminEndpoint = function () {
  return function (object: any, methodName: string) {
    UseBefore(AdminAuthMiddleware)(object, methodName);
    UseBefore(HttpExceptionHandler)(object, methodName);
  };
};
