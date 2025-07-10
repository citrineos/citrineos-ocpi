import { Container, Service } from 'typedi';
import Koa from 'koa';
import { VersionsController } from './versions';
import {
  CacheWrapper,
  KoaServer,
  OcpiExceptionHandler,
  OcpiSequelizeInstance,
  ServerConfig,
  Env,
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
      // Create a minimal ServerConfig for the mock server
      const mockServerConfig: ServerConfig = {
        env: Env.DEVELOPMENT,
        logLevel: 1,
        data: {
          sequelize: {
            host: 'localhost',
            port: 5432,
            database: 'ocpi',
            dialect: 'postgres',
            username: 'ocpi',
            password: 'ocpi',
            storage: '',
            sync: false,
          },
        },
        centralSystem: { host: 'localhost', port: 8080 },
        util: {
          cache: { redis: { host: 'localhost', port: 6379 } },
          messageBroker: { amqp: false },
          networkConnection: { websocketServers: [] },
        },
        ocpiServer: { host: 'localhost', port: 3000 },
        modules: {},
        maxCallLengthSeconds: 30,
        maxCachingSeconds: 300,
      };
      Container.set('ServerConfig', mockServerConfig);
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
        middlewares: [OcpiExceptionHandler],
        defaultErrorHandler: false,
      });
      this.initKoaSwagger(
        {
          title: 'CitrineOS EMSP OCPI 2.2.1 MOCK',
          version: '2.0.0',
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
