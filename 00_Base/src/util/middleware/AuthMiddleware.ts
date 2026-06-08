// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { KoaMiddlewareInterface } from 'routing-controllers';
import {
  HttpHeader,
  HttpStatus,
  UnauthorizedException,
} from '@zetra/citrineos-base';
import { Container, Service } from 'typedi';
import { Logger } from 'tslog';
import { extractToken } from '../decorators/AuthToken.js';
import { OcpiHttpHeader } from '../OcpiHttpHeader.js';
import { BaseMiddleware } from './BaseMiddleware.js';
import { ContentType } from '../ContentType.js';
import { buildOcpiErrorResponse } from '../../model/OcpiErrorResponse.js';
import { OcpiResponseStatusCode } from '../../model/OcpiResponse.js';
import type {
  GetTenantPartnerByServerTokenQueryResult,
  GetTenantPartnerByServerTokenQueryVariables,
} from '../../graphql/index.js';
import {
  GET_TENANT_PARTNER_BY_SERVER_TOKEN,
  OcpiGraphqlClient,
} from '../../graphql/index.js';
import { getRoamingPartner } from '../helpers.js';
import type { TenantPartnerDto } from '@zetra/citrineos-base';

const permittedRoutes: string[] = ['/docs', '/docs/spec', '/favicon.png'];
const registrationModules: string[] = ['versions', 'credentials'];

/**
 * AuthMiddleware is applied via the {@link AsOcpiEndpoint} and {@link AsOcpiOpenRoutingEndpoint} decorators. Endpoints
 * that are annotated with these decorators will have this middleware running. The middleware will check for presense
 * of the auth header, and try and call {@link CredentialsService#authorizeToken} with token, countryCode and partyId.
 * If authentication fails, {@link OcpiErrorResponse} will be thrown with HttpStatus.UNAUTHORIZED which should be handled
 * by global exception handler.
 */
@Service()
export class AuthMiddleware
  extends BaseMiddleware
  implements KoaMiddlewareInterface
{
  constructor(readonly ocpiGraphqlClient: OcpiGraphqlClient) {
    super();
  }

  throwError(ctx: any) {
    ctx.type = ContentType.JSON;
    ctx.status = HttpStatus.UNAUTHORIZED;
    ctx.body = JSON.stringify(
      buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientNotEnoughInformation,
        'Not Authorized',
      ),
    );
  }

  async use(context: any, next: (err?: any) => Promise<any>): Promise<any> {
    const logger = Container.get(Logger);

    const authHeader =
      context.request.headers[HttpHeader.Authorization.toLowerCase()];

    if (!permittedRoutes.includes(context.request.originalUrl)) {
      if (!authHeader) {
        logger.debug(
          `No authorization header found for ${context.request.method} ${context.request.url}`,
        );
        return this.throwError(context);
      }

      try {
        const token = extractToken(authHeader);

        const response = await this.ocpiGraphqlClient.request<
          GetTenantPartnerByServerTokenQueryResult,
          GetTenantPartnerByServerTokenQueryVariables
        >(GET_TENANT_PARTNER_BY_SERVER_TOKEN, { serverToken: token });

        const tenantPartner = response.TenantPartners[0];
        if (!tenantPartner) {
          logger.debug(
            `Authorization failed - tenant partner not found for token`,
          );
          throw new UnauthorizedException(
            'Credentials not found for given token 1',
          );
        }
        if (
          !registrationModules.some((value) =>
            (context.request.originalUrl as string).includes(value),
          )
        ) {
          const fromCountryCode = this.getHeader(
            context,
            OcpiHttpHeader.OcpiFromCountryCode,
          );
          const fromPartyId = this.getHeader(
            context,
            OcpiHttpHeader.OcpiFromPartyId,
          );
          const toCountryCode = this.getHeader(
            context,
            OcpiHttpHeader.OcpiToCountryCode,
          );
          const toPartyId = this.getHeader(
            context,
            OcpiHttpHeader.OcpiToPartyId,
          );

          const hasRoutingHeaders =
            fromCountryCode && fromPartyId && toCountryCode && toPartyId;

          if (hasRoutingHeaders) {
            const roamingPartner = getRoamingPartner(
              tenantPartner as TenantPartnerDto,
              fromCountryCode,
              fromPartyId,
            );
            const isFromHeaderValid =
              (tenantPartner.countryCode === fromCountryCode &&
                tenantPartner.partyId === fromPartyId) ||
              roamingPartner;
            const isToHeaderValid =
              tenantPartner.tenant &&
              tenantPartner.tenant?.countryCode === toCountryCode &&
              tenantPartner.tenant?.partyId === toPartyId;
            if (!isFromHeaderValid || !isToHeaderValid) {
              logger.debug(
                `String token matched tenantPartner with incorrect routing headers - ${tenantPartner.countryCode}:${fromCountryCode}, ${tenantPartner.partyId}:${fromPartyId}, ${tenantPartner.tenant.countryCode}:${toCountryCode}, ${tenantPartner.tenant.partyId}:${toPartyId}`,
              );
              throw new UnauthorizedException(
                'Credentials not found for given token 2',
              );
            }
            if (roamingPartner) {
              context.state.roamingPartner = roamingPartner;
            }
          } else {
            const match = (context.request.path as string).match(
              /\/ocpi\/(?:cpo|emsp)\/[\d.]+\/\w+\/([A-Z]{2})\/([A-Z]{2,3})/i,
            );
            const countryCode = match?.[1];
            const partyId = match?.[2];

            if (countryCode && partyId) {
              if (
                tenantPartner.countryCode !== countryCode ||
                tenantPartner.partyId !== partyId
              ) {
                logger.debug(`URL params mismatch with token tenant partner`);
                throw new UnauthorizedException(
                  'Credentials not found for given token 3',
                );
              }
            } else if (
              context.request.body.country_code &&
              context.request.body.party_id
            ) {
              if (
                tenantPartner.countryCode !==
                  context.request.body.country_code ||
                tenantPartner.partyId !== context.request.body.party_id
              ) {
                logger.debug(
                  `Body attributes mismatch with token tenant partner`,
                );
                throw new UnauthorizedException(
                  'Credentials not found for given token 4',
                );
              }
            } else {
              if (!context.state.skipTenantPartnerUrlValidation) {
                logger.debug(
                  `No URL params found for ${context.request.method} ${context.request.url}`,
                );
                throw new UnauthorizedException(
                  'Credentials not found for given token 5',
                );
              }
            }
          }
        }

        context.state.tenantPartner = tenantPartner;
      } catch (error: any) {
        logger.debug(
          `Authorization error: ${error?.message ?? '(no message)'} | ${error?.stack ?? JSON.stringify(error)}`,
        );

        logger.debug(`Authorization error: ${error.message}`);
        return this.throwError(context);
      }
    } else {
      logger.debug('Route is permitted, skipping authentication');
    }
    return await next();
  }
}
