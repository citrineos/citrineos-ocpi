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
      if (!authHeader) {
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

        const tenantPartner: ITenantPartnerDto | undefined =
          await this.ocpiGraphqlClient.request<ITenantPartnerDto>(
            GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT,
            {
              cpoCountryCode: fromCountryCode,
              cpoPartyId: fromPartyId,
              clientCountryCode: toCountryCode,
              clientPartyId: toPartyId,
            },
          );
        if (
          !tenantPartner ||
          token !== tenantPartner.partnerProfileOCPI?.serverCredentials.token
        ) {
          throw new UnauthorizedException(
            'Credentials not found for given token',
          );
        }
      } catch (_error) {
        return this.throwError(context);
      }
    }
    return await next();
  }
}
