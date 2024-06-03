import Koa from "koa";
import {
  getMetadataArgsStorage,
  MetadataArgsStorage,
  RoutingControllersOptions,
  useKoaServer
} from "routing-controllers";
import {OpenAPIObject, InfoObject} from "openapi3-ts";
import KoaLogger from "koa-logger";
import {routingControllersToSpec} from "./openapi-spec-helper";
import {VersionNumber} from "./model/VersionNumber";
import {getAllSchemas} from "./openapi-spec-helper/schemas";
import {koaSwagger} from "koa2-swagger-ui";

export class Server {

  koa!: Koa;
  app!: Koa;
  storage!: MetadataArgsStorage;
  spec!: OpenAPIObject;

  constructor() {
  }

  protected initLogger() {
    this.koa.use(KoaLogger());
  }

  protected initApp(options: RoutingControllersOptions = {}) {
    this.app = useKoaServer(this.koa, options);
  }

  protected initKoaSwagger(info: InfoObject) {
    this.storage = getMetadataArgsStorage();
    this.spec = routingControllersToSpec(
      this.storage,
      {},
      {
        info,
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

  protected startApp(port: number) {
    this.app.on('error', (err, _ctx) => {
      console.log('Error intercepted by Koa:', err.message);
    });

    this.app.listen(port);
    console.log(`Server started on port ${port}`);
  }
}
