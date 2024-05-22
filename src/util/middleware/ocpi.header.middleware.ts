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

      // todo create @Paginated() annotation and set X-Total-Count and X-Limit headers as per pg 28 https://evroaming.org/app/uploads/2021/11/OCPI-2.2.1.pdf

      const xRequestId = this.getHeader(context, OcpiHttpHeader.XRequestId);
      const xCorrelationId = this.getHeader(context, OcpiHttpHeader.XCorrelationId);
      context.response.set(OcpiHttpHeader.XRequestId, xRequestId);
      context.response.set(OcpiHttpHeader.XCorrelationId, xCorrelationId);

      const fromCountryCode = this.getHeader(context, OcpiHttpHeader.OcpiFromCountryCode);
      const fromPartyId = this.getHeader(context, OcpiHttpHeader.OcpiFromPartyId);
      const toCountryCode = this.getHeader(context, OcpiHttpHeader.OcpiToCountryCode);
      const toPartyId = this.getHeader(context, OcpiHttpHeader.OcpiToPartyId);
      context.response.set(OcpiHttpHeader.OcpiFromCountryCode, toCountryCode);
      context.response.set(OcpiHttpHeader.OcpiFromPartyId, toPartyId);
      context.response.set(OcpiHttpHeader.OcpiToCountryCode, fromCountryCode);
      context.response.set(OcpiHttpHeader.OcpiToPartyId, fromPartyId);
      await next();
    } catch (err) {
      console.error('OcpiHeaderMiddleware error', err);
    }
  }

  private getHeader(context: Context, header: string) {
    const headers = context.req.headers;
    return headers[header.toLowerCase()];
  }
}
