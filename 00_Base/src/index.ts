export { buildOcpiRegistrationParams } from './trigger/util/ocpi.registration.params';
export { fromCredentialsRoleDTO } from './model/ClientCredentialsRole';
export { KoaServer } from './util/koa.server';
export { CountryCode } from './util/util';
export { ImageCategory } from './model/ImageCategory';
export { versionIdParam } from './util/decorators/version.number.param';
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
export { AsOcpiFunctionalEndpoint } from './util/decorators/as.ocpi.functional.endpoint';
export { MultipleTypes } from './util/decorators/multiple.types';
export { OcpiNamespace } from './util/ocpi.namespace';
export { OcpiLogger } from './util/ocpi.logger';
export { OcpiServerConfig } from './config/ocpi.server.config';
export { OcpiModuleConfig } from './config/ocpi.module.config';
export { OcpiCacheConfig } from './config/ocpi.cache.config';
export {
  OcpiMessageSenderConfig,
  OcpiMessageHandlerConfig,
} from './config/ocpi.message.config';
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

import Koa from 'koa';
import { GlobalExceptionHandler } from './util/middleware/global.exception.handler';
import { LoggingMiddleware } from './util/middleware/logging.middleware';
import { OcpiModuleConfig } from './config/ocpi.module.config';
import { Container, Service } from 'typedi';
import { useContainer } from 'routing-controllers';
import { OcpiModule } from './model/IOcpiModule';
import { OcpiServerConfig } from './config/ocpi.server.config';
import { sequelize as sequelizeCore } from '@citrineos/data';
import { SystemConfig } from '@citrineos/base';
import { OcpiSequelizeInstance } from './util/sequelize';
import { OcpiLogger } from './util/ocpi.logger';
import { KoaServer } from './util/koa.server';

useContainer(Container);

@Service()
export class OcpiServer extends KoaServer {
  readonly koa: Koa;
  modules: OcpiModule[] = [];
  serverConfig: OcpiServerConfig;

  constructor(
    serverConfig: OcpiServerConfig,
    modulesConfig: OcpiModuleConfig,
    logger: OcpiLogger,
    _sequelizeInstance: OcpiSequelizeInstance,
  ) {
    super();

    this.serverConfig = serverConfig;
    try {
      // initialize sequelize repositories
      Container.set(
        sequelizeCore.SequelizeLocationRepository,
        new sequelizeCore.SequelizeLocationRepository(
          serverConfig as SystemConfig,
          logger,
        ),
      );
      // Container.set('Authorization', new Authorization())
      // Container.set('Boot', new Boot())
      // Container.set('Certificate', new Certificate())
      Container.set(
        sequelizeCore.SequelizeDeviceModelRepository,
        new sequelizeCore.SequelizeDeviceModelRepository(
          serverConfig as SystemConfig,
          logger,
        ),
      );
      // Container.set('MessageInfo', new MessageInfo())
      // Container.set('SecurityEvent', new SecurityEvent())
      // Container.set('Subscription', new Subscription())
      // Container.set('Tariff', new Tariff())
      // Container.set('TransactionEventRepository', new SequelizeTransactionEventRepository(serverConfig as SystemConfig, logger, sequelize));
      // Container.set('VariableMonitoring', new VariableMonitoring())

      for (const moduleType of modulesConfig.moduleTypes) {
        this.modules.push(Container.get(moduleType));
      }

      this.koa = new Koa();
      this.initLogger();
      const controllers =
        this.modules.map((module) => module.getController()) || [];
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

  public run() {
    this.koa.listen({
      host: this.serverConfig.ocpiServer.host,
      port: this.serverConfig.ocpiServer.port,
    });
  }
}
