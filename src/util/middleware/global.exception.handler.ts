import {KoaMiddlewareInterface, Middleware, UnauthorizedError,} from 'routing-controllers';
import {Context} from 'vm';
import {HttpStatus} from '@citrineos/base';
import {buildOcpiErrorResponse,} from '../ocpi.error.response';
import {Service} from "typedi";

@Middleware({type: 'before', priority: 10})
@Service()
export class GlobalExceptionHandler implements KoaMiddlewareInterface {
  public async use(
    ctx: Context,
    next: (err?: any) => Promise<any>,
  ): Promise<any> {
    try {
      await next();
    } catch (err) {
      // todo implement other errors
      console.error('GlobalExceptionHandler error', err);
      if (err?.constructor?.name) {
        switch (err.constructor.name) {
          case UnauthorizedError.name:
            ctx.status = HttpStatus.UNAUTHORIZED;
            ctx.body = JSON.stringify(
              buildOcpiErrorResponse(HttpStatus.UNAUTHORIZED, 'Not Authorized'),
            );
            break;
          case 'ParamRequiredError':
            ctx.status = HttpStatus.BAD_REQUEST;
            ctx.body = JSON.stringify(
              buildOcpiErrorResponse(
                HttpStatus.BAD_REQUEST,
                (err as any).message,
              ),
            );
            break;
          default:
            ctx.status = HttpStatus.INTERNAL_SERVER_ERROR;
            ctx.body = JSON.stringify(
              buildOcpiErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR),
            );
        }
      }
    }
  }
}
