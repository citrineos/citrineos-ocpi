export {KoaServer} from "./util/koa.server";
export {CountryCode} from "./util/util";
export {ImageCategory} from "./model/ImageCategory";
export {OcpiServerConfig} from "./config/ocpi.server.config";
export {versionIdParam} from "./util/decorators/version.number.param";
export {EndpointDTO} from "./model/Endpoint";
export {VersionsClientApi} from "./trigger/VersionsClientApi";
export {ClientCredentialsRole} from "./model/client.credentials.role";
export {CredentialsDTO} from "./model/DTO/CredentialsDTO";
export {plainToClass} from "./util/util";
export {invalidClientCredentialsRoles} from "./util/util";
export {ClientVersion} from "./model/client.version";
export {ClientInformationRepository} from "./repository/client.information.repository";
export {
  ClientInformation, toCredentialsDTO,
  getClientVersionDetailsByModuleId
} from "./model/client.information";
export {OcpiRegistrationParams} from "./trigger/util/ocpi.registration.params";
export {OcpiHttpHeader} from "./util/ocpi.http.header";
export {generateMockOcpiResponse, BaseController} from './controllers/base.controller';
export {CommandType} from './model/CommandType';
export {CancelReservation} from './model/CancelReservation'
export {ReserveNow} from './model/ReserveNow';
export {StartSession} from './model/StartSession';
export {StopSession} from './model/StopSession';
export {UnlockConnector} from './model/UnlockConnector';
export {OcpiCommandResponse} from './model/CommandResponse';
export {ModuleId} from './model/ModuleId';
export {Version, IVersion} from './model/Version';
export {Endpoint} from './model/Endpoint';
export {BaseCredentialsRole} from './model/BaseCredentialsRole'
export {CredentialsResponse} from './model/credentials.response'
export {OcpiResponseStatusCode} from './model/ocpi.response'
export {OcpiEmptyResponse} from './model/ocpi.empty.response'
export {VersionNumber} from './model/VersionNumber'
export {VersionDetailsResponseDTO} from './model/DTO/VersionDetailsResponseDTO'
export {VersionListResponseDTO} from './model/DTO/VersionListResponseDTO'
export {VersionDetailsDTO} from './model/DTO/VersionDetailsDTO'
export {VersionDTO} from './model/DTO/VersionDTO'
export {OcpiResponse} from './model/ocpi.response'
export {IOcpiModule} from './model/IOcpiModule'
export {VersionRepository} from './repository/version.repository'
export {AsOcpiFunctionalEndpoint} from './util/decorators/as.ocpi.functional.endpoint'
export {MultipleTypes} from './util/decorators/multiple.types'
export {OcpiNamespace} from './util/ocpi.namespace'
export {OcpiLogger} from './util/logger'
export {OcpiSequelizeInstance} from './util/sequelize'
export {AsOcpiRegistrationEndpoint} from './util/decorators/as.ocpi.registration.endpoint'
export {AuthToken} from './util/decorators//auth.token'
export {VersionNumberParam} from './util/decorators/version.number.param'
export {EnumParam} from './util/decorators/enum.param'
export {GlobalExceptionHandler} from './util/middleware/global.exception.handler'
export {LoggingMiddleware} from './util/middleware/logging.middleware'
export {ResponseSchema} from './openapi-spec-helper/decorators'
export {CommandsService} from './services/commands.service'
export {VersionService} from './services/version.service'
export {UnsuccessfulRequestException} from './exception/unsuccessful.request.exception'
export {OcpiParams} from "./trigger/util/ocpi.params";
export {ImageType} from "./model/ImageType";
export {InterfaceRole} from "./model/InterfaceRole";
export {Role} from "./model/Role";

import {Container} from 'typedi';
import {useContainer} from 'routing-controllers';
import {IOcpiModule} from "./model/IOcpiModule";


useContainer(Container);

export class OcpiModuleConfig {
  modules?: IOcpiModule[]
}

export {OcpiServer} from './util/ocpi.server'

