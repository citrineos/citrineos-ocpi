import {QueryParams, UseBefore} from 'routing-controllers';
import {PaginatedMiddleware} from "../middleware/paginated.middleware";

export const PAGINATED_PARAM = 'PaginatedParam';

export const Paginated = () =>
  function (object: NonNullable<unknown>, methodName: string, index: number) {
    QueryParams()(object, methodName, index);
    UseBefore(PaginatedMiddleware)(object, methodName);

    // Add custom metadata for additional use cases
    Reflect.defineMetadata(
      PAGINATED_PARAM,
      true,
      object,
      `${methodName}`,
    );
  };
