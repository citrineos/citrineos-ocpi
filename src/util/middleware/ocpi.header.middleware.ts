import {KoaMiddlewareInterface, Middleware,} from 'routing-controllers';
import {Context} from 'vm';
import {Service} from "typedi";

@Middleware({type: 'before'})
@Service()
export class OcpiHeaderMiddleware implements KoaMiddlewareInterface {
  public async use(
    ctx: Context,
    next: (err?: any) => Promise<any>,
  ): Promise<any> {
    try {
      console.log('OcpiHeaderMiddleware before', ctx);
      await next();
      console.log('OcpiHeaderMiddleware after', ctx);
    } catch (err) {
      console.error('OcpiHeaderMiddleware error', err);
    }
  }
}
