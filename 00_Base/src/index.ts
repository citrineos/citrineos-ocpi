import { Constructable } from 'typedi';
import { GlobalExceptionHandler } from './util/middleware/global.exception.handler';
import { LoggingMiddleware } from './util/middleware/logging.middleware';
import { OcpiServerConfig } from './config/ocpi.server.config';
import { OcpiSequelizeInstance } from './util/sequelize';
import { KoaServer } from './util/koa.server';
import Koa from 'koa';
import { ICache, IMessageHandler, IMessageSender } from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { OcpiModule } from './model/OcpiModule';
import { MessageHandlerWrapper } from './util/MessageHandlerWrapper';
import { MessageSenderWrapper } from './util/MessageSenderWrapper';
import { CacheWrapper } from './util/CacheWrapper';

export { OcpiModule } from './model/OcpiModule';
export { OcpiServerConfig } from './config/ocpi.server.config';

export {
  generateMockOcpiResponse,
  BaseController,
} from './controllers/base.controller';

export { CommandType } from './model/CommandType';
export { CancelReservation } from './model/CancelReservation';
export { ReserveNow } from './model/ReserveNow';
export { StartSession } from './model/StartSession';
export { StopSession } from './model/StopSession';
export { UnlockConnector } from './model/UnlockConnector';
export { OcpiCommandResponse } from './model/CommandResponse';
export { ModuleId } from './model/ModuleId';
export { Credentials } from './model/Credentials'
export { Version } from './model/Version'
export { Endpoint } from './model/Endpoint'
export { CredentialsRole } from './model/CredentialsRole'
export { CredentialsResponse } from './model/Credentials'
export { OcpiResponseStatusCode } from './model/ocpi.response'
export { OcpiEmptyResponse } from './model/ocpi.empty.response'
export { VersionNumber } from './model/VersionNumber'
export { VersionDetailsDTOResponse } from './model/Version'
export { VersionDTOListResponse } from './model/Version'
export { VersionDetailsDTO, VersionDTO } from './model/Version'
export { OcpiResponse } from './model/ocpi.response'
export { CommandResponse } from './model/CommandResponse'
export { ChargingProfileResponse } from './model/ChargingProfileResponse'
export { CommandResultType } from './model/CommandResult';

export { VersionRepository } from './repository/version.repository';

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

export { BaseClientApi } from './trigger/BaseClientApi'
export { CommandsClientApi } from './trigger/CommandsClientApi'
export { ResponseSchema } from './openapi-spec-helper/decorators';

export { CommandsService } from './services/commands.service'
export { CredentialsService } from './services/credentials.service'
export { VersionService } from './services/version.service'
export { ChargingProfilesService } from './services/charging-profiles.service'

export { ResponseUrlRepository } from './repository/response-url.repository'

import { Container } from 'typedi';
import { useContainer } from 'routing-controllers';
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
      const controllers = this.modules.map((module) => {
        return module.getController();
      });
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
