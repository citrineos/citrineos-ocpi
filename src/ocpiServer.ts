import Koa from "koa";
import {getMetadataArgsStorage, useKoaServer} from "routing-controllers";
import {authorizationChecker} from "./util/authorization.checker";
import {CredentialsController} from "./controllers/credentials.controller";
import {CdrsController} from "./controllers/cdrs.controller";
import {ChargingProfilesController} from "./controllers/charging.profiles.controller";
import {TariffsController} from "./controllers/tariffs.controller";
import {CommandsController} from "./controllers/commands.controller";
import {LocationsController} from "./controllers/locations.controller";
import {SessionsController} from "./controllers/sessions.controller";
import {VersionsController} from "./controllers/versions.controller";
import {AuthMiddleware} from "./util/middleware/auth.middleware";
import {GlobalExceptionHandler} from "./util/middleware/global.exception.handler";
import {routingControllersToSpec} from "./util/openapi";
import {VersionNumber} from "./model/VersionNumber";
import {getAllSchemas} from "./schemas";
import {koaSwagger} from "koa2-swagger-ui";
import {OcpiServerConfig} from "./config/ocpi.server.config";
import {injectable} from "tsyringe";
import {OcpiSequelizeInstance} from "./util/sequelize";

@injectable()
export class OcpiServer {

  koa = new Koa();

  app = useKoaServer(this.koa, {
    authorizationChecker: authorizationChecker,
    controllers: [
      CredentialsController,
      CdrsController,
      ChargingProfilesController,
      TariffsController,
      CommandsController,
      LocationsController,
      SessionsController,
      VersionsController
    ],
    routePrefix: '/ocpi/:versionId', // dynamic API version in the prefix
    middlewares: [
      AuthMiddleware,
      GlobalExceptionHandler
    ],
    defaultErrorHandler: false, // Important: Disable the default error handler
  });

  storage = getMetadataArgsStorage();

  spec = routingControllersToSpec(
    this.storage,
    {},
    {
      info: {title: 'CitrineOS OCPI 2.2.1', version: '1.0.0'},
      servers: Object.values(VersionNumber).map(version => ({
        url: `/ocpi/${version}`
      })),
      security: [
        {
          authorization: [],
        },
      ],
    },
  );

  constructor(
    readonly config: OcpiServerConfig,
    readonly ocpiSequelizeInstance: OcpiSequelizeInstance
  ) {

    this.spec['components'] = {
      securitySchemes: {
        authorization: {
          type: 'http',
          scheme: 'bearer',
        },
      },
      schemas: getAllSchemas(),
    };

    this.app.use(
      koaSwagger({
        routePrefix: '/docs',
        exposeSpec: true,
        swaggerOptions: {
          spec: this.spec as any,
        },
      }),
    );

    this.app.on('error', (err, _ctx) => {
      console.log('Error intercepted by Koa:', err.message);
    });

    this.app.listen(8085);
    console.log('Server started on port 8085');
  }
}
