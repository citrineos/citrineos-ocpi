import {KoaMiddlewareInterface, Middleware} from 'routing-controllers';
import {HttpStatus} from '@citrineos/base';
import {Context} from 'vm';
import {buildOcpiErrorResponse} from '../ocpi.error.response';
import {Service} from 'typedi';
import {CredentialsRepository} from '../../repository/credentials.repository';
import {extractToken} from '../decorators/auth.token';

const permittedRoutes: string[] = ['/docs', '/docs/spec', '/favicon.png'];

@Middleware({type: 'before'})
@Service()
export class AuthMiddleware implements KoaMiddlewareInterface {

  constructor(
    readonly credentialsRepository: CredentialsRepository
  ) {
  }

  throwError(ctx: Context) {
    ctx.throw(
      HttpStatus.UNAUTHORIZED,
      JSON.stringify(buildOcpiErrorResponse(HttpStatus.UNAUTHORIZED)),
    );
  }

  async use(ctx: Context, next: (err?: any) => Promise<any>): Promise<any> {
    const authHeader = ctx.request.headers['authorization'];
    if (!permittedRoutes.includes(ctx.request.originalUrl)) {
      if (!authHeader) {
        return this.throwError(ctx);
      }
      try {
        const token = extractToken(authHeader);
        await this.credentialsRepository.authorizeToken(token);
      } catch (error) {
        return this.throwError(ctx);
      }
    }
    return await next();
  }
}
