import {BadRequestError, createParamDecorator} from 'routing-controllers';

const tokenPrefix = 'Token ';
const bearerPrefix = 'Bearer ';

export function extractToken(authorization: string): string {
    let token = authorization;
    // Check for and remove Bearer prefix which is automatically added by swagger
    if (authorization.startsWith(bearerPrefix)) {
        token = authorization.slice(bearerPrefix.length).trim();
    }
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

export function AuthToken() {
    return createParamDecorator({
        required: true,
        value: (action) => {
            const authorizationHeader = action.request.headers['authorization'];
            if (!authorizationHeader) {
                throw new BadRequestError('Missing Authorization header');
            }

            return extractToken(authorizationHeader);
        }
    });
}
