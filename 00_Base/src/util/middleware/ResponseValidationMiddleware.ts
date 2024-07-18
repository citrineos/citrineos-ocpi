import {
  getMetadataArgsStorage,
  InternalServerError,
  KoaMiddlewareInterface,
  Middleware,
} from 'routing-controllers';
import { plainToClass } from '../util';
import { Service } from 'typedi';
import { Context } from 'vm';
import { validate } from 'class-validator';
import { validatedResponseParam } from '../decorators/ValidatedResponseSchema';
import {
  OcpiResponse,
  OcpiResponseStatusCode,
  OcpiRoutePrefix,
} from '../../index';
import { ResponseValidationError } from '../../exception/ResponseValidationError';

/**
 * ResponseValidationMiddleware will perform class-validator validation on response body
 * using the class that was passed into the {@link ValidatedResponseSchema} decorator
 * which in turn enables the middleware on the endpoint
 */
@Middleware({ type: 'before' })
@Service()
export class ResponseValidationMiddleware implements KoaMiddlewareInterface {
  async use(
    context: Context,
    next: (err?: any) => Promise<any>,
    ...args: any[]
  ): Promise<any> {
    await next();

    const route = this.findRoute(context);
    if (route) {
      const { target, method } = route;
      const responseClass = Reflect.getMetadata(
        validatedResponseParam,
        target.prototype,
        method,
      );

      if (responseClass && context.body) {
        const dto: OcpiResponse<any> = plainToClass(
          responseClass,
          context.body,
        );
        if (dto.status_code === OcpiResponseStatusCode.GenericSuccessCode) {
          const errors = await validate(dto);
          if (errors.length > 0) {
            const errorMessages = errors
              .map((error) => error.toString())
              .join('');
            throw new ResponseValidationError(errorMessages);
          }
        } else {
          // todo handle OcpiErrorResponse and OcpiEmptyResponse
        }
      }
    } else {
      throw new InternalServerError(
        'Could not find matching route? This should not happen',
      );
    }
  }

  private findRoute = (ctx: Context) => {
    const storage = getMetadataArgsStorage();
    const matchedRoute = ctx._matchedRoute;
    if (!matchedRoute) return null;
    const method = ctx.request?.req?.method?.toLowerCase();
    if (!method) return null;
    const controllerMetadata = storage.controllers.find((controller) => {
      return matchedRoute.startsWith(`${OcpiRoutePrefix}${controller.route}`);
    });

    if (!controllerMetadata) return null;

    const actionMetadata = storage.actions.find((action) => {
      if (
        action.target === controllerMetadata.target &&
        action.type === method
      ) {
        let actionRoute = `${OcpiRoutePrefix}${controllerMetadata.route}`;
        if (action.route) {
          actionRoute += `${action.route}`;
        }
        return actionRoute === matchedRoute;
      }
      return false;
    });

    return actionMetadata || null;
  };
}
