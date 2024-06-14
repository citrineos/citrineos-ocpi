import KoaLogger from "koa-logger";
import Koa from 'koa';

import { GlobalExceptionHandler } from "./util/middleware/global.exception.handler";
import { LoggingMiddleware } from "./util/middleware/logging.middleware";
import { OcpiModuleConfig } from "./config/ocpi.module.config";
import { Container, Service } from 'typedi';
import { useContainer, useKoaServer } from 'routing-controllers';
import { IOcpiModule } from './model/IOcpiModule';
import { OcpiLoggerConfig } from "./config/ocpi.logger.config";
import { OcpiServerConfig } from "./config/ocpi.server.config";
import {
    SequelizeDeviceModelRepository,
    SequelizeLocationRepository
} from "@citrineos/data/dist/layers/sequelize";
import { SystemConfig } from "@citrineos/base";
import { OcpiSequelizeInstance } from './util/sequelize';

export { generateMockOcpiResponse, BaseController } from './controllers/base.controller';

export { CommandType } from './model/CommandType';
export { CancelReservation } from './model/CancelReservation'
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
export { IOcpiModule } from './model/IOcpiModule'
export { VersionRepository } from './repository/version.repository'
export { CredentialsRepository } from './repository/credentials.repository'

export { NotFoundException } from './exception/not.found.exception'

export { AsOcpiFunctionalEndpoint } from './util/decorators/as.ocpi.functional.endpoint'
export { MultipleTypes } from './util/decorators/multiple.types'
export { OcpiNamespace } from './util/ocpi.namespace'
export { OcpiLogger } from './util/logger'
export { OcpiSequelizeInstance } from './util/sequelize'
export { AsOcpiRegistrationEndpoint } from './util/decorators/as.ocpi.registration.endpoint'
export { AuthToken } from './util/decorators//auth.token'
export { VersionNumberParam } from './util/decorators/version.number.param'
export { EnumParam } from './util/decorators/enum.param'
export { GlobalExceptionHandler } from './util/middleware/global.exception.handler'
export { LoggingMiddleware } from './util/middleware/logging.middleware'

export { ResponseSchema } from './openapi-spec-helper/decorators'

export { BaseClientApi } from './trigger/BaseClientApi'

export { CommandsService } from './services/commands.service'
export { CredentialsService } from './services/credentials.service'
export { VersionService } from './services/version.service'

useContainer(Container);

@Service()
export class OcpiServer {
    readonly koa: Koa
    modules: IOcpiModule[] = [];
    serverConfig: OcpiServerConfig;

    constructor(
      serverConfig: OcpiServerConfig,
      modulesConfig: OcpiModuleConfig,
      loggerConfig: OcpiLoggerConfig,
      sequelizeInstance: OcpiSequelizeInstance
    ) {
        this.serverConfig = serverConfig;

        const logger = loggerConfig.logger;
        const sequelize = sequelizeInstance.sequelize;

        // initialize sequelize repositories
        Container.set('LocationRepository', new SequelizeLocationRepository(serverConfig as SystemConfig, logger, sequelize));
        // Container.set('Authorization', new Authorization())
        // Container.set('Boot', new Boot())
        // Container.set('Certificate', new Certificate())
        Container.set('DeviceModelRepository', new SequelizeDeviceModelRepository(serverConfig as SystemConfig, logger, sequelize));
        // Container.set('MessageInfo', new MessageInfo())
        // Container.set('SecurityEvent', new SecurityEvent())
        // Container.set('Subscription', new Subscription())
        // Container.set('Tariff', new Tariff())
        // Container.set('TransactionEventRepository', new SequelizeTransactionEventRepository(serverConfig as SystemConfig, logger, sequelize));
        // Container.set('VariableMonitoring', new VariableMonitoring())

        // TODO initialize modules
        for (let moduleType of modulesConfig.moduleTypes) {
            Container.get(moduleType);
        }

        this.koa = new Koa()
        this.koa.use(KoaLogger());
        useKoaServer(this.koa, {
            controllers: this.modules.map(module => module.getController()) || [],
            routePrefix: '/ocpi/:versionId',
            middlewares: [GlobalExceptionHandler, LoggingMiddleware],
            defaultErrorHandler: false
        })
    }

    public run() {
        this.koa.listen({
            host: this.serverConfig.ocpiServer.host,
            port: this.serverConfig.ocpiServer.port
        })
    }
}
