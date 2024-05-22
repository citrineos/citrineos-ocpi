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
    // todo create @Paginated() annotation and set X-Total-Count and X-Limit headers as per pg 28 https://evroaming.org/app/uploads/2021/11/OCPI-2.2.1.pdf
    await next();
  }
}
