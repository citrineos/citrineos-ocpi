import { useContainer } from 'routing-controllers';
import { Container } from 'typedi';
import { IOcpiModule } from './model/IOcpiModule';
import { GlobalExceptionHandler } from './util/middleware/global.exception.handler';
import { LoggingMiddleware } from './util/middleware/logging.middleware';
import { OcpiServerConfig } from './config/ocpi.server.config';
import { OcpiSequelizeInstance } from './util/sequelize';
import { KoaServer } from './util/koa.server';
import Koa from 'koa';
import {
  ICache,
  IMessage,
  IMessageConfirmation,
  IMessageHandler,
  IMessageSender,
  MessageState,
  OcppError,
} from '../../../citrineos-core/00_Base';
import { ILogObj, Logger } from 'tslog';
import { undefined } from 'zod';
import { OcppRequest, OcppResponse } from '@citrineos/base';

export { OcpiServerConfig } from './config/ocpi.server.config';
export { CommandResponse } from './model/CommandResponse';

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

export { ResponseSchema } from './openapi-spec-helper/decorators';

export { BaseClientApi } from './trigger/BaseClientApi';

export { CommandsService } from './services/commands.service';
export { CredentialsService } from './services/credentials.service';
export { VersionService } from './services/version.service';

useContainer(Container);

export { Container } from 'typedi';

export class OcpiModuleConfig {
  modules?: IOcpiModule[];
}

export class MessageSenderHandler {
  handler: IMessageHandler;
  sender: IMessageSender;
  constructor(handler: IMessageHandler, sender: IMessageSender) {
    this.handler = handler;
    this.sender = sender;
  }
}

export class Cache {
  cache: ICache;
  constructor(cache: ICache) {
    this.cache = cache;
  }
}

export class OcpiServer extends KoaServer {
  readonly koa: Koa;
  readonly moduleConfig: OcpiModuleConfig;
  readonly serverConfig: OcpiServerConfig;
  readonly cache: ICache;
  readonly handler: IMessageHandler;
  readonly sender: IMessageSender;
  readonly logger: Logger<ILogObj>;
  readonly sequelizeInstance: OcpiSequelizeInstance;
  readonly modules: OcpiModule[] = [];

  constructor(
    moduleConfig: OcpiModuleConfig,
    serverConfig: OcpiServerConfig,
    cache: ICache,
    handler: IMessageHandler,
    sender: IMessageSender,
    logger: Logger<ILogObj>,
  ) {
    super();

    this.moduleConfig = moduleConfig;
    this.serverConfig = serverConfig;
    this.cache = cache;
    this.handler = handler;
    this.sender = sender;
    this.logger = logger;

    Container.set(
      MessageSenderHandler,
      new MessageSenderHandler(this.handler, this.sender),
    );
    Container.set(Cache, this.cache);
    Container.set(Logger, this.logger);

    this.sequelizeInstance = new OcpiSequelizeInstance(this.serverConfig);

    this.moduleConfig.modules?.forEach((module) => {
      this.modules.push(Container.get(module as any));
    });

    try {
      this.koa = new Koa();
      const controllers =
        this.modules?.map((module) => module.getController()) || [];
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
