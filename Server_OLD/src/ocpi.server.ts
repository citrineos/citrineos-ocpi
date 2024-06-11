import Koa from 'koa';
import {CdrsController} from './handlers/cdrs.controller';
import {ChargingProfilesController} from './handlers/charging.profiles.controller';
import {TariffsController} from './handlers/tariffs.controller';
import {CommandsController} from './handlers/commands.controller';
import {LocationsController} from './handlers/locations.controller';
import {SessionsController} from './handlers/sessions.controller';
import {GlobalExceptionHandler} from './util/middleware/global.exception.handler';
import {Service} from 'typedi';
import {OcpiSequelizeInstance} from './util/sequelize';
import {LoggingMiddleware} from './util/middleware/logging.middleware';
import {TokensController} from './handlers/tokens.controller';
import {Server} from './server';
// import {CredentialsController} from '../../03_Modules/Credentials/src/module/api';
// import {VersionsController} from '../../03_Modules/Versions/src/module/api';

/**
 * Main server class that starts Koa app and Swagger UI
 */
@Service()
export class OcpiServer extends Server {
  constructor(
    _sequelize: OcpiSequelizeInstance, // need to init Sequelize instance otherwise error is throws for Models, for now injecting it here
  ) {
    super();
    try {
      this.koa = new Koa();
      this.initLogger();
      this.initApp({
        controllers: [
          // CredentialsController,
          CdrsController,
          ChargingProfilesController,
          TariffsController,
          CommandsController,
          LocationsController,
          SessionsController,
          // VersionsController,
          TokensController,
        ],
        routePrefix: '/ocpi',
        middlewares: [GlobalExceptionHandler, LoggingMiddleware],
        defaultErrorHandler: false, // Important: Disable the default error handler
      });
      this.initKoaSwagger({
        title: 'CitrineOS OCPI 2.2.1',
        version: '1.0.0',
      }, [{
        url: '/ocpi',
      }]);
      this.startApp(8085);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
