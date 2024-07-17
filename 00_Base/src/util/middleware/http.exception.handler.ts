import { KoaMiddlewareInterface, Middleware, NotFoundError, UnauthorizedError } from 'routing-controllers';
import { Context } from 'vm';
import { Service } from 'typedi';
import { HttpStatus } from '@citrineos/base';
import { MissingParamException } from '../../exception/missing.param.exception';
import { AlreadyRegisteredException } from '../../exception/AlreadyRegisteredException';
import { NotRegisteredException } from '../../exception/NotRegisteredException';
import { UnknownTokenException } from '../../exception/unknown.token.exception';
import { WrongClientAccessException } from '../../exception/wrong.client.access.exception';
import { InvalidParamException } from '../../exception/invalid.param.exception';
import { UnsuccessfulRequestException } from '../../exception/UnsuccessfulRequestException';

@Middleware({ type: 'before', priority: 10 })
@Service()
export class HttpExceptionHandler implements KoaMiddlewareInterface {
  public async use(
      context: Context,
      next: (err?: any) => Promise<any>,
  ): Promise<any> {
      try {
        await next();
      } catch (err) {
        // TODO return a "custom" http object

        console.error('HttpExceptionHandler error', err);
        if (err?.constructor?.name) {
          switch (err.constructor.name) {
            case UnauthorizedError.name:
              context.status = HttpStatus.UNAUTHORIZED;
              context.body = JSON.stringify(
                new HttpExceptionBody('Not Authorized')
              );
              break;
            case NotFoundError.name:
              context.status = HttpStatus.NOT_FOUND;
              context.body = JSON.stringify(
                new HttpExceptionBody('Credentials not found')
              );
              break;
            case MissingParamException.name:
              context.status = HttpStatus.BAD_REQUEST;
              context.body = JSON.stringify(
                new HttpExceptionBody((err as any).message)
              );
              break;
            case AlreadyRegisteredException.name:
              context.status = HttpStatus.METHOD_NOT_ALLOWED;
              context.body = JSON.stringify(
                new HttpExceptionBody('Client already registered')
              );
              break;
            case NotRegisteredException.name:
              context.status = HttpStatus.METHOD_NOT_ALLOWED;
              context.body = JSON.stringify(
                new HttpExceptionBody('Client not registered')
              );
              break;
            case UnknownTokenException.name:
              context.status = HttpStatus.NOT_FOUND;
              context.body = JSON.stringify(
                new HttpExceptionBody((err as any).message)
              );
              break;
            case WrongClientAccessException.name:
              context.status = HttpStatus.NOT_FOUND;
              break;
            case InvalidParamException.name:
              context.status = HttpStatus.BAD_REQUEST;
              context.body = JSON.stringify(
                new HttpExceptionBody((err as any).message)
              );
              break;
            case UnsuccessfulRequestException.name:
              context.status = HttpStatus.BAD_REQUEST;
              context.body = JSON.stringify(
                new HttpExceptionBody((err as any).message)
              );
              break;
            default:
              context.status = HttpStatus.INTERNAL_SERVER_ERROR;
              context.body = JSON.stringify(
                new HttpExceptionBody(`Internal Server Error, ${(err as Error).message}: ${JSON.stringify((err as any).errors)}`)
              );
          }
        }
      }
  }
}

class HttpExceptionBody {
  message?: string;

  constructor(message?: string) {
    this.message = message;
  }
}