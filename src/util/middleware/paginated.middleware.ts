import {KoaMiddlewareInterface, Middleware,} from 'routing-controllers';
import {Context} from 'vm';
import {Service} from 'typedi';
import {BaseMiddleware} from "./base.middleware";

@Middleware({type: 'before'})
@Service()
export class PaginatedMiddleware extends BaseMiddleware implements KoaMiddlewareInterface {
  public async use(
    context: Context,
    next: (err?: any) => Promise<any>,
  ): Promise<any> {
    /* const xRequestId = this.getHeader(context, OcpiHttpHeader.XRequestId);
    const xCorrelationId = this.getHeader(context, OcpiHttpHeader.XCorrelationId);
    context.response.set(OcpiHttpHeader.XRequestId, xRequestId);
    context.response.set(OcpiHttpHeader.XCorrelationId, xCorrelationId); */
    console.log(context);
    await next();
  }
}
