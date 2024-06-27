import {
  KoaMiddlewareInterface,
  Middleware,
  NotFoundError,
  UnauthorizedError} from 'routing-controllers';
import { Context } from 'vm';
import { HttpStatus } from '@citrineos/base';
import { buildOcpiErrorResponse } from '../../model/ocpi.error.response';
import { Service } from 'typedi';
import { UnknownTokenException } from '../../exception/unknown.token.exception';
import { OcpiResponseStatusCode } from '../../model/ocpi.response';
import { WrongClientAccessException } from '../../exception/wrong.client.access.exception';
import { InvalidParamException } from '../../exception/invalid.param.exception';
import { MissingParamException } from '../../exception/missing.param.exception';
import { AlreadyRegisteredException } from '../../exception/AlreadyRegisteredException';
import { NotRegisteredException } from '../../exception/NotRegisteredException';

/**
 * GlobalExceptionHandler handles all exceptions
 */
@Middleware({ type: 'before', priority: 10 })
@Service()
export class GlobalExceptionHandler implements KoaMiddlewareInterface {
  public async use(
    context: Context,
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
            context.status = HttpStatus.UNAUTHORIZED;
            context.body = JSON.stringify(
              buildOcpiErrorResponse(
                OcpiResponseStatusCode.ClientNotEnoughInformation,
                'Not Authorized',
              ),
            );
            break;
          case NotFoundError.name:
            context.status = HttpStatus.NOT_FOUND;
            context.body = JSON.stringify(
              buildOcpiErrorResponse(
                OcpiResponseStatusCode.ClientInvalidOrMissingParameters,
                'Credentials not found',
              ),
            );
            break;
          case MissingParamException.name:
            context.status = HttpStatus.BAD_REQUEST;
            context.body = JSON.stringify(
              buildOcpiErrorResponse(
                OcpiResponseStatusCode.ClientInvalidOrMissingParameters,
                (err as any).message,
              ),
            );
            break;
          case AlreadyRegisteredException.name:
            context.status = HttpStatus.METHOD_NOT_ALLOWED;
            context.body = JSON.stringify(
              buildOcpiErrorResponse(
                OcpiResponseStatusCode.ClientNotEnoughInformation,
                'Client already registered',
              ),
            );
            break;
          case NotRegisteredException.name:
            context.status = HttpStatus.METHOD_NOT_ALLOWED;
            context.body = JSON.stringify(
              buildOcpiErrorResponse(
                OcpiResponseStatusCode.ClientNotEnoughInformation,
                'Client not registered',
              ),
            );
            break;
          case UnknownTokenException.name:
            context.status = HttpStatus.OK;
            context.body = JSON.stringify(
              buildOcpiErrorResponse(
                OcpiResponseStatusCode.ClientUnknownToken,
                (err as any).message,
              ),
            );
            break;
          case WrongClientAccessException.name:
            context.status = HttpStatus.NOT_FOUND;
            break;
          case InvalidParamException.name:
            context.status = HttpStatus.OK;
            context.body = JSON.stringify(
              buildOcpiErrorResponse(
                OcpiResponseStatusCode.ClientInvalidOrMissingParameters,
                (err as any).message,
              ),
            )
            break;
          default:
            context.status = HttpStatus.INTERNAL_SERVER_ERROR;
            context.body = JSON.stringify(
              buildOcpiErrorResponse(
                OcpiResponseStatusCode.ClientGenericError,
                `Internal Server Error, ${(err as Error).message}: ${JSON.stringify((err as any).errors)}`,
              ),
            );
        }
      }
    }
  }
}
