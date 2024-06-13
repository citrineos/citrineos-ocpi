import Koa from 'koa';
import {
  getMetadataArgsStorage,
  MetadataArgsStorage,
  RoutingControllersOptions,
  useKoaServer,
} from 'routing-controllers';
import { InfoObject, OpenAPIObject } from 'openapi3-ts';
import KoaLogger from 'koa-logger';
import { koaSwagger } from 'koa2-swagger-ui';
import { ServerObject } from 'openapi3-ts/src/model/OpenApi';
import { routingControllersToSpec } from '../../00_Base/src/openapi-spec-helper';
import { getAllSchemas } from '../../00_Base/src/openapi-spec-helper/schemas';

export class Server {
  koa!: Koa;
  app!: Koa;
  storage!: MetadataArgsStorage;
  spec!: OpenAPIObject;

  constructor() {}

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

  protected startApp(port: number) {
    this.app.on('error', (err, _ctx) => {
      console.log('Error intercepted by Koa:', err.message);
    });
    this.app.listen(port);
    console.log(`Server started on port ${port}`);
  }
}
