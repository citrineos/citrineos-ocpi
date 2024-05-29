import Koa from 'koa';
import {getMetadataArgsStorage, RoutingControllersOptions, useKoaServer} from 'routing-controllers';
import {CredentialsController} from './handlers/credentials.controller';
import {CdrsController} from './handlers/cdrs.controller';
import {ChargingProfilesController} from './handlers/charging.profiles.controller';
import {TariffsController} from './handlers/tariffs.controller';
import {CommandsController} from './handlers/commands.controller';
import {LocationsController} from './handlers/locations.controller';
import {SessionsController} from './handlers/sessions.controller';
import {VersionsController} from './handlers/versions.controller';
import {GlobalExceptionHandler} from './util/middleware/global.exception.handler';
import {routingControllersToSpec} from './openapi-spec-helper';
import {VersionNumber} from './model/VersionNumber';
import {getAllSchemas} from './openapi-spec-helper/schemas';
import {koaSwagger} from 'koa2-swagger-ui';
import {Service} from 'typedi';
import {OcpiSequelizeInstance} from './util/sequelize';
import {LoggingMiddleware} from './util/middleware/logging.middleware';
import KoaLogger from 'koa-logger';
import {TokensController} from './handlers/tokens.controller';
import {Server} from "./server";
import {InfoObject} from "openapi3-ts/src/model/OpenApi";

/**
 * Main server class that starts Koa app and Swagger UI
 */
@Service()
export class OcpiServer extends Server {


  constructor(
    _sequelize: OcpiSequelizeInstance // need to init Sequelize instance otherwise error is throws for Models, for now injecting it here
  ) {
    super();
    try {
      this.koa = new Koa();
      this.initLogger();
      this.initApp({
        controllers: [
          CredentialsController,
          CdrsController,
          ChargingProfilesController,
          TariffsController,
          CommandsController,
          LocationsController,
          SessionsController,
          VersionsController,
          TokensController
        ],
        routePrefix: '/ocpi/:versionId', // dynamic API version in the prefix
        middlewares: [
          GlobalExceptionHandler,
          LoggingMiddleware,
        ],
        defaultErrorHandler: false, // Important: Disable the default error handler
      });
      this.initKoaSwagger({
        title: 'CitrineOS OCPI 2.2.1',
        version: '1.0.0'
      });
      this.startApp(8085);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
