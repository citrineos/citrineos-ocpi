import Koa from "koa";
import {
  getMetadataArgsStorage,
  MetadataArgsStorage,
  RoutingControllersOptions,
  useKoaServer
} from "routing-controllers";
import {InfoObject, OpenAPIObject, ServerObject} from "openapi3-ts";
import KoaLogger from "koa-logger";
import {routingControllersToSpec} from "../openapi-spec-helper";
import {getAllSchemas} from "../openapi-spec-helper/schemas";
import {koaSwagger} from "koa2-swagger-ui";

export class KoaServer {
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

  protected initKoaSwagger(info: InfoObject, servers: ServerObject[] = []) {
    this.storage = getMetadataArgsStorage();
    this.spec = routingControllersToSpec(
      this.storage,
      {},
      {
        info,
        servers,
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
          description: 'Token <base64_token>',
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
}
