import {Service} from "typedi";
import {KoaServer} from "./koa.server";
import Koa from "koa";
import {GlobalExceptionHandler, LoggingMiddleware, OcpiModuleConfig} from "../index";

@Service()
export class OcpiServer extends KoaServer {
  readonly koa: Koa

  constructor(moduleConfig?: OcpiModuleConfig) { // todo inject OcpiServerConfig here to not need to pass in host/port?
    super();
    try {
      this.koa = new Koa();
      this.initLogger();
      this.initApp({
        controllers: moduleConfig?.modules?.map(module => module.getController()) || [],
        routePrefix: '/ocpi',
        middlewares: [GlobalExceptionHandler, LoggingMiddleware],
        defaultErrorHandler: false
      })
      this.initKoaSwagger({
        title: 'CitrineOS OCPI 2.2.1',
        version: '1.0.0',
      }, [{
        url: '/ocpi',
      }]);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }

  public run(host: string, port: number) {
    this.app.on('error', (err, _ctx) => {
      console.log('Error intercepted by Koa:', err.message);
    });
    this.app.listen(port, host);
    console.log(`Server started on port ${port}`);
  }
}
