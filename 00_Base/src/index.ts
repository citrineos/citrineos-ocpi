import { useContainer } from 'routing-controllers';
import { Container } from 'typedi';
import { IOcpiModule } from './model/IOcpiModule';
import { GlobalExceptionHandler } from './util/middleware/global.exception.handler';
import { LoggingMiddleware } from './util/middleware/logging.middleware';
import { OcpiServerConfig } from './config/ocpi.server.config';
import { OcpiSequelizeInstance } from './util/sequelize';
import { KoaServer } from './util/koa.server';
import Koa from 'koa';

export { OcpiServerConfig } from './config/ocpi.server.config';
export { CommandResponse } from './model/CommandResponse';

export {
  generateMockOcpiResponse,
  generateMockOcpiPaginatedResponse,
  BaseController,
} from './controllers/base.controller';
export { PaginatedParams } from './controllers/param/paginated.params';
export { CommandType } from './model/CommandType';
export { CancelReservation } from './model/CancelReservation';
export { ReserveNow } from './model/ReserveNow';
export { StartSession } from './model/StartSession';
export { StopSession } from './model/StopSession';
export { UnlockConnector } from './model/UnlockConnector';
export { OcpiCommandResponse } from './model/CommandResponse';
export { ModuleId } from './model/ModuleId';
export { Credentials } from './model/Credentials';
export { Version } from './model/Version';
export { Endpoint } from './model/Endpoint';
export { CredentialsRole } from './model/CredentialsRole';
export { CredentialsResponse } from './model/Credentials';
export { OcpiResponseStatusCode } from './model/ocpi.response';
export { OcpiEmptyResponse } from './model/ocpi.empty.response';
export { VersionNumber } from './model/VersionNumber';
export { VersionDetailsDTOResponse } from './model/Version';
export { VersionDTOListResponse } from './model/Version';
export { VersionDetailsDTO, VersionDTO } from './model/Version';
export { OcpiResponse } from './model/ocpi.response';
export { IOcpiModule } from './model/IOcpiModule';
export { VersionRepository } from './repository/version.repository';
export { Location, LocationResponse, PaginatedLocationResponse } from './model/Location';
export { EvseDTO, EvseResponse } from './model/Evse';
export { Connector, ConnectorResponse } from './model/Connector';

export { NotFoundException } from './exception/not.found.exception';

export { AsOcpiFunctionalEndpoint } from './util/decorators/as.ocpi.functional.endpoint';
export { MultipleTypes } from './util/decorators/multiple.types';
export { OcpiNamespace } from './util/ocpi.namespace';
export { OcpiLogger } from './util/logger';
export { OcpiSequelizeInstance } from './util/sequelize';
export { AsOcpiRegistrationEndpoint } from './util/decorators/as.ocpi.registration.endpoint';
export { AuthToken } from './util/decorators//auth.token';
export { VersionNumberParam } from './util/decorators/version.number.param';
export { EnumParam } from './util/decorators/enum.param';
export { GlobalExceptionHandler } from './util/middleware/global.exception.handler';
export { LoggingMiddleware } from './util/middleware/logging.middleware';
export { Paginated } from './util/decorators/paginated';

export {
  AUTH_CONTROLLER_COMPONENT,
  EVSE_COMPONENT,
  CONNECTOR_COMPONENT,
  TOKEN_READER_COMPONENT,
  UNKNOWN_ID
} from './util/consts';

export { ResponseSchema } from './openapi-spec-helper/decorators';

export { BaseClientApi } from './trigger/BaseClientApi';
export { LocationsClientApi } from './trigger/LocationsClientApi';

export { CommandsService } from './services/commands.service';
export { CredentialsService } from './services/credentials.service';
export { LocationsService } from './services/locations.service';
export { VersionService } from './services/version.service';

useContainer(Container);

export { Container } from 'typedi';

export class OcpiModuleConfig {
  modules?: IOcpiModule[];
}

export class OcpiServer extends KoaServer {
  readonly koa: Koa;
  readonly serverConfig: OcpiServerConfig;
  readonly sequelizeInstance: OcpiSequelizeInstance;

  constructor(moduleConfig: OcpiModuleConfig, serverConfig: OcpiServerConfig) {
    super();

    this.serverConfig = serverConfig;
    this.sequelizeInstance = new OcpiSequelizeInstance(this.serverConfig);

    try {
      this.koa = new Koa();
      const controllers =
        moduleConfig.modules?.map((module) => module.getController()) || [];
      this.initApp({
        controllers,
        routePrefix: '/ocpi',
        middlewares: [GlobalExceptionHandler, LoggingMiddleware],
        defaultErrorHandler: false,
      });
      this.initKoaSwagger(
        {
          title: 'CitrineOS OCPI 2.2.1',
          version: '1.0.0',
        },
        [
          {
            url: '/ocpi',
          },
        ],
      );
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
