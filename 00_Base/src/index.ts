import { RoutingControllersOptions, useContainer } from 'routing-controllers';
import { Constructable, Container } from 'typedi';
import { OcpiModule } from './model/OcpiModule';
import { GlobalExceptionHandler } from './util/middleware/global.exception.handler';
import { LoggingMiddleware } from './util/middleware/logging.middleware';
import { OcpiServerConfig } from './config/ocpi.server.config';
import { OcpiSequelizeInstance } from './util/sequelize';
import { KoaServer } from './util/koa.server';
import Koa from 'koa';
import { ICache, IMessageHandler, IMessageSender } from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { CacheWrapper } from './util/CacheWrapper';
import { CdrsController } from './controllers/cdrs.controller';
import { ChargingProfilesController } from './controllers/charging.profiles.controller';
import { SessionsController } from './controllers/sessions.controller';
import { TariffsController } from './controllers/tariffs.controller';
import { TokensController } from './controllers/tokens.controller';
import {
  RepositoryStore,
  SequelizeDeviceModelRepository,
  SequelizeTransactionEventRepository,
} from '@citrineos/data';
import {
  SequelizeAuthorizationRepository,
  SequelizeBootRepository,
  SequelizeCertificateRepository,
  SequelizeLocationRepository,
  SequelizeMessageInfoRepository,
  SequelizeSecurityEventRepository,
  SequelizeSubscriptionRepository,
  SequelizeTariffRepository,
  SequelizeVariableMonitoringRepository,
} from '@citrineos/data';

export { Role } from './model/Role';
export { ImageCategory } from './model/ImageCategory';
export { ImageType } from './model/ImageType';
export { CountryCode } from './util/util';
export { KoaServer } from './util/koa.server';
export { InterfaceRole } from './model/InterfaceRole';
export { toCredentialsDTO } from './model/ClientInformation';
export { AlreadyRegisteredException } from './exception/AlreadyRegisteredException';
export { NotRegisteredException } from './exception/NotRegisteredException';
export { Image } from './model/Image';
export { BusinessDetails } from './model/BusinessDetails';
export { VersionsClientApi } from './trigger/VersionsClientApi';
export { CredentialsDTO } from './model/DTO/CredentialsDTO';
export { ClientVersion } from './model/ClientVersion';
export { ClientInformationRepository } from './repository/ClientInformationRepository';
export { ClientInformation } from './model/ClientInformation';
export { ClientCredentialsRole } from './model/ClientCredentialsRole';
export { fromCredentialsRoleDTO } from './model/ClientCredentialsRole';
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
export { Version, IVersion } from './model/Version';
export { Endpoint } from './model/Endpoint';
export { CredentialsRole } from './model/CredentialsRole';
export { CredentialsResponse } from './model/CredentialsResponse';
export { OcpiResponseStatusCode } from './model/ocpi.response';
export { OcpiEmptyResponse } from './model/ocpi.empty.response';
export { VersionNumber } from './model/VersionNumber';
export { VersionDetailsResponseDTO } from './model/DTO/VersionDetailsResponseDTO';
export { VersionListResponseDTO } from './model/DTO/VersionListResponseDTO';
export { VersionDetailsDTO } from './model/DTO/VersionDetailsDTO';
export { VersionDTO } from './model/DTO/VersionDTO';
export { OcpiResponse } from './model/ocpi.response';
export { OcpiModule } from './model/OcpiModule';
export { VersionRepository } from './repository/VersionRepository';
export { CommandResultType } from './model/CommandResult';
export { LocationDTO, LocationResponse, PaginatedLocationResponse } from './model/DTO/LocationDTO';
export { EvseDTO, EvseResponse } from './model/DTO/EvseDTO';
export { ConnectorDTO, ConnectorResponse } from './model/DTO/ConnectorDTO';

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
export { MessageSenderWrapper } from './util/MessageSenderWrapper';
export { MessageHandlerWrapper } from './util/MessageHandlerWrapper';
export { CacheWrapper } from './util/CacheWrapper';

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
  readonly ocpiSequelizeInstance: OcpiSequelizeInstance;
  readonly modules: OcpiModule[] = [];
  readonly repositoryStore: RepositoryStore;

  constructor(
    serverConfig: OcpiServerConfig,
    cache: ICache,
    logger: Logger<ILogObj>,
    modulesConfig: OcpiModuleConfig[],
    repositoryStore: RepositoryStore,
  ) {
    super();

    this.serverConfig = serverConfig;
    this.cache = cache;
    this.logger = logger;
    this.ocpiSequelizeInstance = new OcpiSequelizeInstance(this.serverConfig);
    this.repositoryStore = repositoryStore;

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
      const options: RoutingControllersOptions = {
        controllers: [
          ...controllers,
          CdrsController,
          ChargingProfilesController,
          SessionsController,
          TariffsController,
          TokensController,
        ],
        routePrefix: '/ocpi',
        middlewares: [GlobalExceptionHandler, LoggingMiddleware],
        defaultErrorHandler: false,
      } as RoutingControllersOptions;
      this.initApp(options);
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
    Container.set(OcpiSequelizeInstance, this.ocpiSequelizeInstance);
    Container.set(RepositoryStore, this.repositoryStore);
    Container.set(
      SequelizeAuthorizationRepository,
      this.repositoryStore.authorizationRepository,
    );
    Container.set(SequelizeBootRepository, this.repositoryStore.bootRepository);
    Container.set(
      SequelizeCertificateRepository,
      this.repositoryStore.certificateRepository,
    );
    Container.set(
      SequelizeDeviceModelRepository,
      this.repositoryStore.deviceModelRepository,
    );
    Container.set(
      SequelizeLocationRepository,
      this.repositoryStore.locationRepository,
    );
    Container.set(
      SequelizeMessageInfoRepository,
      this.repositoryStore.messageInfoRepository,
    );
    Container.set(
      SequelizeSecurityEventRepository,
      this.repositoryStore.securityEventRepository,
    );
    Container.set(
      SequelizeSubscriptionRepository,
      this.repositoryStore.subscriptionRepository,
    );
    Container.set(
      SequelizeTariffRepository,
      this.repositoryStore.tariffRepository,
    );
    Container.set(
      SequelizeTransactionEventRepository,
      this.repositoryStore.transactionEventRepository,
    );
    Container.set(
      SequelizeVariableMonitoringRepository,
      this.repositoryStore.variableMonitoringRepository,
    );
  }
}
