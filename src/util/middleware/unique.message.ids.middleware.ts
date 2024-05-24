import {KoaMiddlewareInterface, Middleware, } from 'routing-controllers';
import {Context} from 'vm';
import {Service} from 'typedi';
import {OcpiHttpHeader} from '../ocpi.http.header';
import {BaseMiddleware} from './base.middleware';

/**
 * UniqueMessageIdsMiddleware will apply the {@link OcpiHttpHeader.XRequestId} and {@link OcpiHttpHeader.XCorrelationId}
 * if they are present in the request headers.
 */
@Middleware({type: 'before'})
@Service()
export class UniqueMessageIdsMiddleware extends BaseMiddleware implements KoaMiddlewareInterface {
  public async use(
    context: Context,
    next: (err?: any) => Promise<any>,
  ): Promise<any> {
    const xRequestId = this.getHeader(context, OcpiHttpHeader.XRequestId);
    const xCorrelationId = this.getHeader(context, OcpiHttpHeader.XCorrelationId);
    context.response.set(OcpiHttpHeader.XRequestId, xRequestId);
    context.response.set(OcpiHttpHeader.XCorrelationId, xCorrelationId);
    await next();
  }
}
