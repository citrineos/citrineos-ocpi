import { KoaMiddlewareInterface } from 'routing-controllers';
import { HttpHeader, HttpStatus } from '@citrineos/base';
import { Service } from 'typedi';
import { extractToken } from '../decorators/AuthToken';
import { OcpiHttpHeader } from '../OcpiHttpHeader';
import { BaseMiddleware } from './BaseMiddleware';
import { ClientInformationRepository } from '../../repository/ClientInformationRepository';
import { ContentType } from '../ContentType';
import { buildOcpiErrorResponse } from '../../model/OcpiErrorResponse';
import { OcpiResponseStatusCode } from '../../model/OcpiResponse';

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
  constructor(
    readonly clientInformationRepository: ClientInformationRepository,
  ) {
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
        await this.clientInformationRepository.authorizeToken(
          token,
          fromCountryCode,
          fromPartyId,
          toCountryCode,
          toPartyId,
        );
      } catch (_error) {
        return this.throwError(context);
      }
    }
    return await next();
  }
}
