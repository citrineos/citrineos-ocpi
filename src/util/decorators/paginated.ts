import {QueryParams, UseBefore} from 'routing-controllers';
import {PaginatedMiddleware} from '../middleware/paginated.middleware';

/**
 * Paginated decorator applies {@link PaginatedMiddleware} on the endpoint
 * @constructor
 */
export const Paginated = () =>
  function (object: NonNullable<unknown>, methodName: string, index: number) {
    QueryParams()(object, methodName, index);
    UseBefore(PaginatedMiddleware)(object, methodName);
  };
