import {useContainer} from "routing-controllers";
import {Container} from "typedi";
import {OcpiModule} from "./model/OcpiModule";
import {GlobalExceptionHandler} from "./util/middleware/global.exception.handler";
import {LoggingMiddleware} from "./util/middleware/logging.middleware";
import {OcpiServerConfig} from "./config/ocpi.server.config";
import {OcpiSequelizeInstance} from "./util/sequelize";
import {KoaServer} from "./util/koa.server";
import Koa from "koa";
export {ImageCategory} from "./model/ImageCategory";
export {ImageType} from "./model/ImageType";
export {CountryCode} from "./util/util";

export {KoaServer} from "./util/koa.server";
export {InterfaceRole} from "./model/InterfaceRole";
export {toCredentialsDTO} from "./model/ClientInformation";
export {AlreadyRegisteredException} from "./exception/AlreadyRegisteredException";
export {NotRegisteredException} from "./exception/NotRegisteredException";
export {Image} from "./model/Image";
export {BusinessDetails} from "./model/BusinessDetails";
export {VersionsClientApi} from "./trigger/VersionsClientApi";
export {CredentialsDTO} from "./model/DTO/CredentialsDTO";
export {ClientVersion} from "./model/ClientVersion";
export {ClientInformationRepository} from "./repository/ClientInformationRepository";
export {ClientInformation} from "./model/ClientInformation";
export {ClientCredentialsRole} from "./model/ClientCredentialsRole";
export {fromCredentialsRoleDTO} from "./model/ClientCredentialsRole";

export {OcpiServerConfig} from "./config/ocpi.server.config";
export {CommandResponse} from "./model/CommandResponse";

export {
  generateMockOcpiResponse,
  BaseController,
} from "./controllers/base.controller";

export {CommandType} from "./model/CommandType";
export {CancelReservation} from "./model/CancelReservation";
export {ReserveNow} from "./model/ReserveNow";
export {StartSession} from "./model/StartSession";
export {StopSession} from "./model/StopSession";
export {UnlockConnector} from "./model/UnlockConnector";
export {OcpiCommandResponse} from "./model/CommandResponse";
export {ModuleId} from "./model/ModuleId";
export {Version} from "./model/Version";
export {Endpoint} from "./model/Endpoint";
export {CredentialsRole} from "./model/CredentialsRole";
export {CredentialsResponse} from "./model/CredentialsResponse";
export {OcpiResponseStatusCode} from "./model/ocpi.response";
export {OcpiEmptyResponse} from "./model/ocpi.empty.response";
export {VersionNumber} from "./model/VersionNumber";
export {VersionDetailsResponseDTO} from "./model/DTO/VersionDetailsResponseDTO";
export {VersionListResponseDTO} from "./model/DTO/VersionListResponseDTO";
export {VersionDetailsDTO} from "./model/DTO/VersionDetailsDTO";
export {VersionDTO} from "./model/DTO/VersionDTO";
export {OcpiResponse} from "./model/ocpi.response";
export {OcpiModule} from "./model/OcpiModule";
export {VersionRepository} from "./repository/VersionRepository";

export {AsOcpiFunctionalEndpoint} from "./util/decorators/as.ocpi.functional.endpoint";
export {MultipleTypes} from "./util/decorators/multiple.types";
export {OcpiNamespace} from "./util/ocpi.namespace";
export {OcpiLogger} from "./util/logger";
export {OcpiSequelizeInstance} from "./util/sequelize";
export {AsOcpiRegistrationEndpoint} from "./util/decorators/as.ocpi.registration.endpoint";
export {AuthToken} from "./util/decorators//auth.token";
export {VersionNumberParam} from "./util/decorators/version.number.param";
export {EnumParam} from "./util/decorators/enum.param";
export {GlobalExceptionHandler} from "./util/middleware/global.exception.handler";
export {LoggingMiddleware} from "./util/middleware/logging.middleware";

export {ResponseSchema} from "./openapi-spec-helper/decorators";

export {BaseClientApi} from "./trigger/BaseClientApi";

export {CommandsService} from "./services/commands.service";
export {CredentialsService} from "./services/credentials.service";
export {VersionService} from "./services/version.service";
export {versionIdParam} from "./util/decorators/version.number.param";

useContainer(Container);

export {Container} from "typedi";

export class OcpiModuleConfig {
  modules?: OcpiModule[];
}

export class OcpiServer extends KoaServer {
  readonly koa: Koa;
  readonly serverConfig: OcpiServerConfig;
  readonly sequelizeInstance: OcpiSequelizeInstance;

  constructor(moduleConfig: OcpiModuleConfig, serverConfig: OcpiServerConfig) {
    super();

    this.serverConfig = serverConfig;
    this.sequelizeInstance = new OcpiSequelizeInstance(this.serverConfig);

    try {
      this.koa = new Koa();
      const controllers =
        moduleConfig.modules?.map((module) => module.getController()) || [];
      this.initApp({
        controllers,
        routePrefix: "/ocpi",
        middlewares: [GlobalExceptionHandler, LoggingMiddleware],
        defaultErrorHandler: false,
      });
      this.initKoaSwagger(
        {
          title: "CitrineOS OCPI 2.2.1",
          version: "1.0.0",
        },
        [
          {
            url: "/ocpi",
          },
        ],
      );
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
