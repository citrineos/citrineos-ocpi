import KoaLogger from 'koa-logger';
import Koa from 'koa';

import { GlobalExceptionHandler } from './util/middleware/global.exception.handler';
import { LoggingMiddleware } from './util/middleware/logging.middleware';
import { OcpiModuleConfig } from './config/ocpi.module.config';
import { Container, Service } from 'typedi';
import { useContainer, useKoaServer } from 'routing-controllers';
import { IOcpiModule } from './model/IOcpiModule';
import { OcpiServerConfig } from './config/ocpi.server.config';
import { sequelize as sequelizeCore } from '@citrineos/data';
import { SystemConfig } from '@citrineos/base';
import { OcpiSequelizeInstance } from './util/sequelize';
import { OcpiLogger } from './util/ocpi.logger';

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
export { Version } from './model/Version';
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
export { IOcpiModule } from './model/IOcpiModule';
export { VersionRepository } from './repository/VersionRepository';
export { CredentialsRepository } from './repository/credentials.repository';

export { NotFoundException } from './exception/not.found.exception';

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
export { CredentialsService } from './services/credentials.service';
export { VersionService } from './services/version.service';

useContainer(Container);

@Service()
export class OcpiServer {
  readonly koa: Koa;
  modules: IOcpiModule[] = [];
  serverConfig: OcpiServerConfig;

  constructor(
    serverConfig: OcpiServerConfig,
    modulesConfig: OcpiModuleConfig,
    logger: OcpiLogger,
    _sequelizeInstance: OcpiSequelizeInstance,
  ) {
    this.serverConfig = serverConfig;

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
    this.koa.use(KoaLogger());
    useKoaServer(this.koa, {
      controllers: this.modules.map((module) => module.getController()) || [],
      routePrefix: '/ocpi/:versionId',
      middlewares: [GlobalExceptionHandler, LoggingMiddleware],
      defaultErrorHandler: false,
    });
  }

  public run() {
    this.koa.listen({
      host: this.serverConfig.ocpiServer.host,
      port: this.serverConfig.ocpiServer.port,
    });
  }
}
