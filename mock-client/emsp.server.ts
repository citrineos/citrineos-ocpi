import {Service} from 'typedi';
import Koa from 'koa';
import {VersionsController} from './versions';
import {GlobalExceptionHandler, KoaServer, LoggingMiddleware, OcpiSequelizeInstance} from "@citrineos/ocpi-base";

@Service()
export class EmspServer extends KoaServer {
  constructor(_sequelize: OcpiSequelizeInstance) {
    super();
    try {
      this.koa = new Koa();
      this.initLogger();
      this.initApp({
        controllers: [VersionsController],
        routePrefix: '/ocpi',
        middlewares: [GlobalExceptionHandler, LoggingMiddleware],
        defaultErrorHandler: false,
      });
      this.initKoaSwagger({
        title: 'CitrineOS EMSP OCPI 2.2.1 MOCK',
        version: '1.0.0',
      }, [{
        url: '/ocpi',
      }]);
      this.run('localhost', 8086);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
