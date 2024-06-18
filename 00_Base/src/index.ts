import Koa from 'koa';
import { GlobalExceptionHandler } from './util/middleware/global.exception.handler';
import { LoggingMiddleware } from './util/middleware/logging.middleware';
import { Constructable, Container } from 'typedi';
import { OcpiServerConfig } from './config/ocpi.server.config';
import { ICache, IMessageHandler, IMessageSender } from '@citrineos/base';
import { OcpiSequelizeInstance } from './util/sequelize';
import { useContainer } from 'routing-controllers';
import { KoaServer } from './util/koa.server';
import { ILogObj, Logger } from 'tslog';
import { OcpiModule } from './model/OcpiModule';
import { CacheWrapper } from './util/CacheWrapper';

export { OcpiModule } from './model/OcpiModule';
export { OcpiServerConfig } from './config/ocpi.server.config';
export { CommandResponse } from './model/CommandResponse';
export {
  generateMockOcpiResponse,
  BaseController,
} from './controllers/BaseController';
export { CommandType } from './model/CommandType';
export { CancelReservation } from './model/CancelReservation';
export { ReserveNow } from './model/ReserveNow';
export { StartSession } from './model/StartSession';
export { StopSession } from './model/StopSession';
export { UnlockConnector } from './model/UnlockConnector';
export { OcpiCommandResponse } from './model/CommandResponse';
export { ModuleId } from './model/ModuleId';
export { Version, IVersion } from './model/Version';
export { Endpoint } from './model/Endpoint';
export { CredentialsRoleDTO } from './model/DTO/CredentialsRoleDTO';
export { CredentialsResponse } from './model/CredentialsResponse';
export { OcpiResponseStatusCode } from './model/ocpi.response';
export { OcpiEmptyResponse } from './model/ocpi.empty.response';
export { VersionNumber } from './model/VersionNumber';
export { VersionDetailsResponseDTO } from './model/DTO/VersionDetailsResponseDTO';
export { VersionListResponseDTO } from './model/DTO/VersionListResponseDTO';
export { VersionDTO } from './model/DTO/VersionDTO';
export { VersionDetailsDTO } from './model/DTO/VersionDetailsDTO';
export { OcpiResponse } from './model/ocpi.response';
export { ConnectorResponse } from './model/Connector';
export { EvseResponse } from './model/Evse';
export { LocationResponse } from './model/Location';
export { CdrResponse, PaginatedCdrResponse } from './model/Cdr';
export { VersionRepository } from './repository/VersionRepository';
export { CommandResultType } from './model/CommandResult';
export { AsOcpiFunctionalEndpoint } from './util/decorators/as.ocpi.functional.endpoint';
export { MultipleTypes } from './util/decorators/multiple.types';
export { OcpiNamespace } from './util/ocpi.namespace';
export { OcpiLogger } from './util/ocpi.logger';
export { CredentialsRole } from './model/CredentialsRole';
export { OcpiSequelizeInstance } from './util/sequelize';
export { AsOcpiRegistrationEndpoint } from './util/decorators/as.ocpi.registration.endpoint';
export { AuthToken } from './util/decorators//auth.token';
export { VersionNumberParam } from './util/decorators/version.number.param';
export { EnumParam } from './util/decorators/enum.param';
export { GlobalExceptionHandler } from './util/middleware/global.exception.handler';
export { LoggingMiddleware } from './util/middleware/logging.middleware';
export { ResponseSchema } from './openapi-spec-helper/decorators';
export { BaseClientApi } from './trigger/BaseClientApi';
export { CommandsService } from './services/commands.service';
export { VersionService } from './services/version.service';
export { NotRegisteredException } from './exception/NotRegisteredException';
export { AlreadyRegisteredException } from './exception/AlreadyRegisteredException';
export { BusinessDetails } from './model/BusinessDetails';
export { Image } from './model/Image';
export {
  Get,
  JsonController,
  Body,
  Param,
  Post,
  Put,
} from 'routing-controllers';
export { PaginatedTokenResponse } from './model/Token';
export { ActiveChargingProfileResult } from './model/ActiveChargingProfileResult';
export { ActiveChargingProfile } from './model/ActiveChargingProfile';
export { ClearChargingProfileResult } from './model/ClearChargingProfileResult';
export { ChargingProfileResult } from './model/ChargingProfileResult';
export { Session } from './model/Session';
export { PaginatedTariffResponse } from './model/Tariff';
export { InterfaceRole } from './model/InterfaceRole';
export { ImageType } from './model/ImageType';
export { Role } from './model/Role';
export { MessageSenderWrapper } from './util/MessageSenderWrapper';
export { MessageHandlerWrapper } from './util/MessageHandlerWrapper';
export { CacheWrapper } from './util/CacheWrapper';
export { buildOcpiRegistrationParams } from './trigger/util/ocpi.registration.params';
export { fromCredentialsRoleDTO } from './model/ClientCredentialsRole';
export { KoaServer } from './util/koa.server';
export { CountryCode } from './util/util';
export { ImageCategory } from './model/ImageCategory';
export { EndpointDTO } from './model/Endpoint';
export { VersionsClientApi } from './trigger/VersionsClientApi';
export { ClientCredentialsRole } from './model/ClientCredentialsRole';
export { CredentialsDTO } from './model/DTO/CredentialsDTO';
export { plainToClass } from './util/util';
export { invalidClientCredentialsRoles } from './util/util';
export { ClientVersion } from './model/ClientVersion';
export { ClientInformationRepository } from './repository/ClientInformationRepository';
export {
  ClientInformation,
  toCredentialsDTO,
  getClientVersionDetailsByModuleId,
} from './model/ClientInformation';
export { OcpiRegistrationParams } from './trigger/util/ocpi.registration.params';
export { OcpiHttpHeader } from './util/ocpi.http.header';

export { versionIdParam } from './util/decorators/version.number.param';

useContainer(Container);

export { Container } from 'typedi';

export class OcpiModuleConfig {
  module!: Constructable<OcpiModule>;
  handler?: IMessageHandler;
  sender?: IMessageSender;
}

export class OcpiServer extends KoaServer {
  koa!: Koa;
  readonly serverConfig: OcpiServerConfig;
  readonly cache: ICache;
  readonly logger: Logger<ILogObj>;
  readonly sequelizeInstance: OcpiSequelizeInstance;
  readonly modules: OcpiModule[] = [];

  constructor(
    serverConfig: OcpiServerConfig,
    cache: ICache,
    logger: Logger<ILogObj>,
    modulesConfig: OcpiModuleConfig[],
  ) {
    super();

    this.serverConfig = serverConfig;
    this.cache = cache;
    this.logger = logger;
    this.sequelizeInstance = new OcpiSequelizeInstance(this.serverConfig);

    this.initContainer();

    this.modules = modulesConfig.map((moduleConfig) => {
      const module = Container.get(moduleConfig.module);
      module.init(moduleConfig.handler, moduleConfig.sender);
      return module;
    });

    this.initServer();
  }

  private initServer() {
    try {
      this.koa = new Koa();
      const controllers = this.modules.map((module) => module.getController());
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

  private initContainer() {
    Container.set(OcpiServerConfig, this.serverConfig);
    Container.set(CacheWrapper, new CacheWrapper(this.cache));
    Container.set(Logger, this.logger);
    Container.set(OcpiSequelizeInstance, this.sequelizeInstance);
  }
}
