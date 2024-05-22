import {KoaMiddlewareInterface, Middleware,} from 'routing-controllers';
import {Context} from 'vm';
import {Service} from 'typedi';
import {OcpiHttpHeader} from "../ocpi.http.header";

@Middleware({type: 'before'})
@Service()
export class OcpiHeaderMiddleware implements KoaMiddlewareInterface {
  public async use(
    context: Context,
    next: (err?: any) => Promise<any>,
  ): Promise<any> {
    try {
      const xRequestId = this.getHeader(context, OcpiHttpHeader.XRequestId);
      const xCorrelationId = this.getHeader(context, OcpiHttpHeader.XCorrelationId);
      context.response.set(OcpiHttpHeader.XRequestId, xRequestId);
      context.response.set(OcpiHttpHeader.XCorrelationId, xCorrelationId);
      console.log('OcpiHeaderMiddleware before', context);
      await next();
      console.log('OcpiHeaderMiddleware after', context);
    } catch (err) {
      console.error('OcpiHeaderMiddleware error', err);
    }
  }

  private getHeader(context: Context, header: string) {
    const headers = context.req.headers;
    return headers[header.toLowerCase()];
  }
}
