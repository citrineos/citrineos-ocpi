import {createParamDecorator} from 'routing-controllers';

// Define the function that processes the Authorization header
function extractToken(authorization: string): string | undefined {
  if (authorization && authorization.indexOf(' ') > -1) {
    return authorization.split(' ')[1];
  } else {
    return authorization;
  }
}

export function AuthToken() {
  return createParamDecorator({
    required: true,
    value: (action) => {
      const authorizationHeader = action.request.headers['authorization'];
      if (authorizationHeader) {
        return extractToken(authorizationHeader);
      } else {
        return undefined; // todo handle non-existent or improperly formatted Authorization header
      }
    }
  });
}
