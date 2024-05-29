import {Service} from "typedi";
import {Server} from "../server";
import {OcpiSequelizeInstance} from "../util/sequelize";
import Koa from "koa";
import {GlobalExceptionHandler} from "../util/middleware/global.exception.handler";
import {LoggingMiddleware} from "../util/middleware/logging.middleware";
import {VersionsController} from "./versions";

@Service()
export class EmspServer extends Server {


  constructor(
    _sequelize: OcpiSequelizeInstance
  ) {
    super();
    try {
      this.koa = new Koa();
      this.initLogger();
      this.initApp({
        controllers: [
          VersionsController,
        ],
        routePrefix: '/ocpi/:versionId',
        middlewares: [
          GlobalExceptionHandler,
          LoggingMiddleware,
        ],
        defaultErrorHandler: false,
      });
      this.initKoaSwagger({
        title: 'CitrineOS EMSP OCPI 2.2.1 MOCK',
        version: '1.0.0'
      });
      this.startApp(8086);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
