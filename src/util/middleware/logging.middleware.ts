import {KoaMiddlewareInterface, Middleware, } from 'routing-controllers';
import {Context} from 'vm';
import {Service} from 'typedi';

// todo fix and make sure that requests are adequately logged or may not be needed with KoaLogger
@Middleware({type: 'after'})
@Service()
export class LoggingMiddleware implements KoaMiddlewareInterface {
  public async use(
    ctx: Context,
    next: (err?: any) => Promise<any>,
  ): Promise<any> {
    console.log('do something before execution...');
    return next()
      .then(() => {
        console.log('do something after execution');
      })
      .catch(error => {
        console.log('Error intercepted by Koa:', error.message);
      });
  }
}
