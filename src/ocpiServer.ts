import Koa from 'koa';
import {Action, getMetadataArgsStorage, MetadataArgsStorage, useKoaServer} from 'routing-controllers';
import {authorizationChecker} from './util/authorization.checker';
import {CredentialsController} from './controllers/credentials.controller';
import {CdrsController} from './controllers/cdrs.controller';
import {ChargingProfilesController} from './controllers/charging.profiles.controller';
import {TariffsController} from './controllers/tariffs.controller';
import {CommandsController} from './controllers/commands.controller';
import {LocationsController} from './controllers/locations.controller';
import {SessionsController} from './controllers/sessions.controller';
import {VersionsController} from './controllers/versions.controller';
import {AuthMiddleware} from './util/middleware/auth.middleware';
import {GlobalExceptionHandler} from './util/middleware/global.exception.handler';
import {routingControllersToSpec} from './util/openapi';
import {VersionNumber} from './model/VersionNumber';
import {getAllSchemas} from './schemas';
import {koaSwagger} from 'koa2-swagger-ui';
import {Service} from 'typedi';
import {OpenAPIObject} from "openapi3-ts";
import {OcpiSequelizeInstance} from "./util/sequelize";
import {LoggingMiddleware} from "./util/middleware/logging.middleware";

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
      this.initApp();
      this.initKoaSwagger();
      this.startApp();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }

  private initApp() {
    this.app = useKoaServer(this.koa, {
      authorizationChecker: this.authorizationChecker,
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
        GlobalExceptionHandler,
        LoggingMiddleware
      ],
      defaultErrorHandler: false, // Important: Disable the default error handler
    });
  }

  private authorizationChecker = async (action: Action, roles: string[]) => {
    // here you can use request/response objects from action
    // also if decorator defines roles it needs to access the action
    // you can use them to provide granular access check
    // checker must return either boolean (true or false)
    // either promise that resolves a boolean value
    // demo code:
    const token = action.request.headers['authorization'];

    // const user = await getEntityManager().findOneByToken(User, token);
    // if (user && !roles.length) return true;
    // if (user && roles.find(role => user.roles.indexOf(role) !== -1)) return true;

    console.log('authorizationChecker', token, roles);
    return true;
  };

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
  }

  private startApp() {
    this.app.on('error', (err, _ctx) => {
      console.log('Error intercepted by Koa:', err.message);
    });

    this.app.listen(8085);
    console.log('Server started on port 8085');
  }
}
