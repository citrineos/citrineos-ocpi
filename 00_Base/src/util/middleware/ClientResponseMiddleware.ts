import { KoaMiddlewareInterface, Middleware } from 'routing-controllers';
import { Context } from 'vm';
import { Service } from 'typedi';
import { BaseMiddleware } from './base.middleware';
import { IRestResponse } from 'typed-rest-client';

@Middleware({ type: 'after' })
@Service()
export class ClientResponseMiddleware
  extends BaseMiddleware
  implements KoaMiddlewareInterface
{
  async use(context: Context, next: (err?: any) => Promise<any>): Promise<any> {
    await next();
    const response = context.response.body as IRestResponse<any>;
    // TODO: parse the response to PaginatedResponse if necessary
  }
}
