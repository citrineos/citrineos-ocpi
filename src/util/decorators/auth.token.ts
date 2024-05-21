import {HeaderParam} from 'routing-controllers';

// Define the function that processes the Authorization header
function extractToken(authorization: string): string | undefined {
  if (authorization && authorization.indexOf(' ') > -1) {
    return authorization.split(' ')[1];
  } else {
    return authorization;
  }
}

export function AuthToken() {
  return function (object: any, methodName: string, index: number) {
    HeaderParam('authorization')(object, methodName, index);

    // Modify the parameter injector to process the header value
    const reflectedParameterInjectors = Reflect.getMetadata('routing-controllers:parameterinjectors', object.constructor, methodName) || [];
    const injector = reflectedParameterInjectors.find((i: any) => i.index === index);
    if (injector) {
      const originalValueHandler = injector.valueHandler;
      injector.valueHandler = (actionProperties: any) => {
        const authorizationHeader = originalValueHandler(actionProperties);
        return extractToken(authorizationHeader);
      };
    }
  };
}
