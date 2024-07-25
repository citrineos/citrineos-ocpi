import { KoaMiddlewareInterface } from 'routing-controllers';
import { HttpHeader, HttpStatus } from '@citrineos/base';
import { Context } from 'vm';
import { buildOcpiErrorResponse } from '../../model/ocpi.error.response';
import { Service } from 'typedi';
import { extractToken } from '../decorators/auth.token';
import { OcpiHttpHeader } from '../ocpi.http.header';
import { BaseMiddleware } from './base.middleware';
import { OcpiResponseStatusCode } from '../../model/ocpi.response';
import { ClientInformationRepository } from '../../repository/ClientInformationRepository';

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

  throwError(ctx: Context) {
    ctx.throw(
      HttpStatus.UNAUTHORIZED,
      JSON.stringify(
        buildOcpiErrorResponse(
          OcpiResponseStatusCode.ClientNotEnoughInformation,
        ),
      ),
    );
  }

  async use(context: Context, next: (err?: any) => Promise<any>): Promise<any> {
    console.debug(`AuthMiddleware executed for ${context.request.method} ${context.request.url}`);
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
      } catch (error) {
        return this.throwError(context);
      }
    }
    return await next();
  }
}
