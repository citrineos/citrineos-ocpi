import {
  KoaMiddlewareInterface,
  Middleware,
  UnauthorizedError,
} from 'routing-controllers';
import { Context } from 'vm';
import { HttpStatus } from '@citrineos/base';
import { buildOcpiErrorResponse } from '../../model/ocpi.error.response';
import { Service } from 'typedi';
import { NotFoundException } from '../../exception/not.found.exception';
import { OcpiResponseStatusCode } from '../../model/ocpi.response';

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
          case NotFoundException.name:
            context.status = HttpStatus.NOT_FOUND;
            context.body = JSON.stringify(
              buildOcpiErrorResponse(
                OcpiResponseStatusCode.ClientInvalidOrMissingParameters,
                'Credentials not found',
              ),
            );
            break;
          case 'ParamRequiredError':
            context.status = HttpStatus.BAD_REQUEST;
            context.body = JSON.stringify(
              buildOcpiErrorResponse(
                OcpiResponseStatusCode.ClientInvalidOrMissingParameters,
                (err as any).message,
              ),
            );
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
