import KoaLogger from "koa-logger";

export { generateMockOcpiResponse, BaseController } from './controllers/base.controller';

export { CancelReservation } from './model/CancelReservation'
export { Capability } from './model/Capability';
export { CommandType } from './model/CommandType';
export { Connector } from './model/Connector';
export { ConnectorFormat } from './model/ConnectorFormat';
export { ConnectorType } from './model/ConnectorType';
export { Credentials } from './model/Credentials';
export { CredentialsRole } from './model/CredentialsRole';
export { CredentialsResponse } from './model/Credentials';
export { Endpoint } from './model/Endpoint';
export { Evse } from './model/Evse';
export { GeoLocation } from './model/GeoLocation';
export { IOcpiModule } from './model/IOcpiModule';
export { Location, LocationResponse, PaginatedLocationResponse } from './model/Location';
export { ModuleId } from './model/ModuleId';
export { OcpiCommandResponse } from './model/CommandResponse';
export { OcpiEmptyResponse } from './model/ocpi.empty.response';
export { OcpiResponse, OcpiResponseStatusCode } from './model/ocpi.response';
export { PowerType } from './model/PowerType';
export { ReserveNow } from './model/ReserveNow';
export { StartSession } from './model/StartSession';
export { StopSession } from './model/StopSession';
export { UnlockConnector } from './model/UnlockConnector';
export { Version } from './model/Version';
export { VersionNumber } from './model/VersionNumber';
export { VersionDetailsDTO, VersionDTO, VersionDetailsDTOResponse, VersionDTOListResponse } from './model/Version';

export { CredentialsRepository } from './repository/credentials.repository';
export { VersionRepository } from './repository/version.repository';

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

export { CommandsService } from './services/commands.service';
export { CredentialsService } from './services/credentials.service';
export { LocationsService } from './services/locations.service';
export { VersionService } from './services/version.service';

import { Container } from 'typedi';
import {useContainer, useKoaServer} from 'routing-controllers';

useContainer(Container);

import { IOcpiModule } from "./model/IOcpiModule";
import Koa from 'koa';

export class OcpiServerConfig {
    modules?: IOcpiModule[]
}

import { GlobalExceptionHandler } from "./util/middleware/global.exception.handler";
import { LoggingMiddleware } from "./util/middleware/logging.middleware";

export class OcpiServer {
    readonly koa: Koa
    constructor(config?: OcpiServerConfig) {
        this.koa = new Koa()
        this.koa.use(KoaLogger());
        useKoaServer(this.koa, {
            controllers: config?.modules?.map(module => module.getController()) || [],
            routePrefix: '/ocpi/:versionId',
            middlewares: [GlobalExceptionHandler, LoggingMiddleware],
            defaultErrorHandler: false
        })
    }

    public run(host: string, port: number) {
        this.koa.listen({
            host: host,
            port: port
        })
    }
}
