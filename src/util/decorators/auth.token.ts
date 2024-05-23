import {BadRequestError, createParamDecorator} from 'routing-controllers';
import {HttpHeader} from "@citrineos/base";

const tokenPrefix = 'Token ';

export function extractToken(authorization: string): string {
  let token = authorization;
  if (token.startsWith(tokenPrefix)) {
    token = authorization.slice(tokenPrefix.length).trim();

    try {
      // Decode the base64 token
      return Buffer.from(token, 'base64').toString('utf-8');
    } catch (error) {
      throw new BadRequestError('Invalid base64 token');
    }
  } else {
    throw new BadRequestError('Invalid Authorization header format');
  }
}

/**
 * AuthToken convenience decorator will extract the token from the Authorization header. Allows to easilly access auth
 * token in request handler like so:
 *
 * @Get()
 * some(@AuthToken() token: string) {
 *   console.log(token);
 * }
 */
export function AuthToken() {
  return createParamDecorator({
    required: true,
    value: (action) => {
      const authorizationHeader = action.request.headers[HttpHeader.Authorization.toLowerCase()];
      if (authorizationHeader) {
        return extractToken(authorizationHeader);
      } else {
        // todo handle non-existent or improperly formatted Authorization header which should be captured in auth middleware and should theoretically be correct by the time this runs
        return undefined;
      }
    }
  });
}
