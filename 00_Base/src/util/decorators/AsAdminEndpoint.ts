// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { UseBefore } from 'routing-controllers';
import { HttpExceptionHandler } from '../middleware/HttpExceptionHandler';
import { OcpiConfigToken } from '../../config/ocpi.types';
import { oidcAuthMiddleware } from '../security/oidcAuthMiddleware';

/**
 * Decorator to add necessary auth and exception handling for "admin" OCPI endpoints
 */
export const AsAdminEndpoint = function () {
  return function (object: any, methodName: string) {
    UseBefore((req: any, res: any, next: any) => {
      const config = req.container.get(OcpiConfigToken);
      if (config.oidc) {
        return oidcAuthMiddleware(config.oidc)(req.ctx, next);
      }
      return next();
    })(object, methodName);
    UseBefore(HttpExceptionHandler)(object, methodName);
  };
};
