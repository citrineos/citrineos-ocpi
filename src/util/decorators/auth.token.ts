import {BadRequestError, createParamDecorator} from 'routing-controllers';

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
