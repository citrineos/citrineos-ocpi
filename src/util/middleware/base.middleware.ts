import {Context} from "vm";

/**
 * Helper Base class for middlewares
 */
export class BaseMiddleware {

  protected getHeader(context: Context, header: string) {
    const headers = context.req.headers;
    return headers[header.toLowerCase()];
  }
}
