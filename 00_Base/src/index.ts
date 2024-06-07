import KoaLogger from "koa-logger";

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

import { Container } from 'typedi';
import {useContainer, useKoaServer} from 'routing-controllers';

useContainer(Container);

import { IOcpiModule } from "./model/IOcpiModule";
import Koa from 'koa';

export class OcpiServerConfig {
    modules?: IOcpiModule[]
    routePrefix?: string
    middlewares?: Function[] | string[]
    defaultErrorHandler?: boolean
}

export class OcpiServer {
    readonly koa: Koa
    constructor(config?: OcpiServerConfig) {
        this.koa = new Koa()
        this.koa.use(KoaLogger());
        useKoaServer(this.koa, {
            controllers: config?.modules?.map(module => module.getController()) || [],
            defaultErrorHandler: config?.defaultErrorHandler,
            routePrefix: config?.routePrefix,
            middlewares: config?.middlewares
        })
    }

    public run(host: string, port: number) {
        this.koa.listen({
            host: host,
            port: port
        })
    }
}
