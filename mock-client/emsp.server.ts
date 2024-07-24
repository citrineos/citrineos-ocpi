import { Container, Service } from 'typedi';
import Koa from 'koa';
import { VersionsController } from './versions';
import {
  CacheWrapper,
  GlobalExceptionHandler,
  KoaServer,
  LoggingMiddleware,
  OcpiSequelizeInstance,
  OcpiServerConfig,
} from '@citrineos/ocpi-base';
import { MemoryCache } from '@citrineos/util';
import { ILogObj, Logger } from 'tslog';
import { TokensController } from './tokens';
import { SessionsController } from './sessions';

@Service()
export class EmspServer extends KoaServer {
  constructor(readonly ocpiSequelizeInstance: OcpiSequelizeInstance) {
    super();
    try {
      Container.set(OcpiServerConfig, {} as OcpiServerConfig);
      Container.set(CacheWrapper, new CacheWrapper(new MemoryCache()));
      Container.set(
        Logger,
        new Logger<ILogObj>({
          name: 'CitrineOS Logger',
        }),
      );
      this.koa = new Koa();
      this.initApp({
        controllers: [VersionsController, SessionsController, TokensController],
        routePrefix: '/ocpi',
        middlewares: [GlobalExceptionHandler, LoggingMiddleware],
        defaultErrorHandler: false,
      });
      this.initKoaSwagger(
        {
          title: 'CitrineOS EMSP OCPI 2.2.1 MOCK',
          version: '1.0.0',
        },
        [
          {
            url: '/ocpi',
          },
        ],
      );
      this.initLogger();
      this.run('0.0.0.0', 8086);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
