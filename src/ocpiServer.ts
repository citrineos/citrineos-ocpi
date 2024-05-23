import Koa from 'koa';
import {getMetadataArgsStorage, MetadataArgsStorage, useKoaServer} from 'routing-controllers';
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
import {OpenAPIObject} from 'openapi3-ts';
import {OcpiSequelizeInstance} from './util/sequelize';
import {LoggingMiddleware} from './util/middleware/logging.middleware';
import KoaLogger from 'koa-logger';
import {TokensController} from "./handlers/tokens.controller";

@Service()
export class OcpiServer {

  koa: Koa;
  app!: Koa;
  storage!: MetadataArgsStorage;
  spec!: OpenAPIObject;

  constructor(
    _sequelize: OcpiSequelizeInstance // need to init Sequelize instance otherwise error is throws for Models, for now injecting it here
  ) {
    try {
      this.koa = new Koa();
      this.initLogger();
      this.initApp();
      this.initKoaSwagger();
      this.startApp();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }

  private initLogger() {
    this.koa.use(KoaLogger());
  }

  private initApp() {
    this.app = useKoaServer(this.koa, {
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
  }

  private initKoaSwagger() {
    this.storage = getMetadataArgsStorage();
    this.spec = routingControllersToSpec(
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
    this.spec['components'] = {
      securitySchemes: {
        authorization: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'Token <base64_token>'
        }
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
  }

  private startApp() {
    this.app.on('error', (err, _ctx) => {
      console.log('Error intercepted by Koa:', err.message);
    });

    this.app.listen(8085);
    console.log('Server started on port 8085');
  }
}
