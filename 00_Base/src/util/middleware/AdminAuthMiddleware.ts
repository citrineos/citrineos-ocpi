// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { KoaMiddlewareInterface } from 'routing-controllers';
import { Container, Service } from 'typedi';
import { OcpiConfigToken } from '../../config/ocpi.types';
import { oidcAuthMiddleware } from '../security/oidcAuthMiddleware';

/**
 * Middleware for admin endpoint authentication
 */
@Service()
export class AdminAuthMiddleware implements KoaMiddlewareInterface {
  use(context: any, next: (err?: any) => Promise<any>): Promise<any> {
    try {
      const config = Container.get(OcpiConfigToken);

      if (config && config.oidc) {
        // Apply OIDC auth middleware if configured
        return oidcAuthMiddleware(config.oidc)(context, next);
      }

      // If no OIDC config, just continue
      return next();
    } catch (error) {
      console.warn('Error in AdminAuthMiddleware:', error);
      return next();
    }
  }
}
