import { KoaMiddlewareInterface } from 'routing-controllers';
import {
  HttpHeader,
  HttpStatus,
  ITenantPartnerDto,
  UnauthorizedException,
} from '@citrineos/base';
import { Service } from 'typedi';
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
  GetTenantPartnerByServerTokenQueryResult,
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
    console.debug(
      `AuthMiddleware executed for ${context.request.method} ${context.request.url}`,
    );

    const authHeader =
      context.request.headers[HttpHeader.Authorization.toLowerCase()];

    if (!permittedRoutes.includes(context.request.originalUrl)) {
      console.debug('Route requires authentication');

      if (!authHeader) {
        console.debug('No authorization header found - throwing error');
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

        console.debug(
          `OCPI headers - From: ${fromCountryCode}/${fromPartyId}, To: ${toCountryCode}/${toPartyId}`,
        );

        console.debug('Making GraphQL request for tenant partner...');
        const response = await this.ocpiGraphqlClient.request<
          GetTenantPartnerByCpoClientAndModuleIdQueryResult,
          GetTenantPartnerByCpoClientAndModuleIdQueryVariables
        >(GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT, {
          cpoCountryCode: toCountryCode,
          cpoPartyId: toPartyId,
          clientCountryCode: fromCountryCode,
          clientPartyId: fromPartyId,
        });

        console.debug(
          `GraphQL response received, tenant partners count: ${response.TenantPartners?.length || 0}`,
        );

        const tenantPartner = response.TenantPartners[0];

        if (
          !tenantPartner ||
          token !== tenantPartner.partnerProfileOCPI?.serverCredentials.token
        ) {
          console.debug(
            'Authorization failed - tenant partner not found or token mismatch',
          );
          throw new UnauthorizedException(
            'Credentials not found for given token',
          );
        }

        console.debug('Authorization successful');
      } catch (error) {
        console.debug(`Authorization error: ${error}`);
        console.debug(`Error json: ${JSON.stringify(error)}`);
        return this.throwError(context);
      }
    } else {
      console.debug('Route is permitted, skipping authentication');
    }
    return await next();
  }
}
