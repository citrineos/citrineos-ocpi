import { KoaMiddlewareInterface, Middleware } from 'routing-controllers';
import { Context } from 'vm';
import { Service } from 'typedi';

// todo fix and make sure that requests are adequately logged or may not be needed with KoaLogger
@Middleware({ type: 'after' })
@Service()
export class LoggingMiddleware implements KoaMiddlewareInterface {
  public async use(
    context: Context,
    next: (err?: any) => Promise<any>,
  ): Promise<any> {
    console.debug(`Received context: ${JSON.stringify(context)}`);
    return next()
      .then(() => {
        console.debug('do something after execution');
      })
      .catch((error) => {
        console.log('Error intercepted by Koa:', error.message);
      });
  }
}
