import { KoaMiddlewareInterface } from 'routing-controllers';
import { HttpHeader, HttpStatus, UnauthorizedException } from '@citrineos/base';
import Container, { Service } from 'typedi';
import { Logger } from 'tslog';
import { extractToken } from '../decorators/AuthToken';
import { OcpiHttpHeader } from '../OcpiHttpHeader';
import { BaseMiddleware } from './BaseMiddleware';
import { ContentType } from '../ContentType';
import { buildOcpiErrorResponse } from '../../model/OcpiErrorResponse';
import { OcpiResponseStatusCode } from '../../model/OcpiResponse';
import { OcpiGraphqlClient } from '../../graphql/OcpiGraphqlClient';
import { GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT } from '../../graphql/queries/tenantPartner.queries';
import {
  GetTenantPartnerByCpoClientAndModuleIdQueryResult,
  GetTenantPartnerByCpoClientAndModuleIdQueryVariables,
} from '../../graphql/operations';

const permittedRoutes: string[] = ['/docs', '/docs/spec', '/favicon.png'];

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
        const toPartyId = this.getHeader(context, OcpiHttpHeader.OcpiToPartyId);

        const response = await this.ocpiGraphqlClient.request<
          GetTenantPartnerByCpoClientAndModuleIdQueryResult,
          GetTenantPartnerByCpoClientAndModuleIdQueryVariables
        >(GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT, {
          cpoCountryCode: toCountryCode,
          cpoPartyId: toPartyId,
          clientCountryCode: fromCountryCode,
          clientPartyId: fromPartyId,
        });

        const tenantPartner = response.TenantPartners[0];

        if (
          !tenantPartner ||
          token !== tenantPartner.partnerProfileOCPI?.serverCredentials.token
        ) {
          logger.debug(
            `Authorization failed - ${!tenantPartner ? 'tenant partner not found' : 'token mismatch'}`,
          );
          throw new UnauthorizedException(
            'Credentials not found for given token',
          );
        }

        context.state.tenantId = tenantPartner.tenant.id;
        context.state.tenantPartnerId = tenantPartner.id;
      } catch (error: any) {
        logger.debug(`Authorization error: ${error.message}`);
        return this.throwError(context);
      }
    } else {
      logger.debug('Route is permitted, skipping authentication');
    }
    return await next();
  }
}
