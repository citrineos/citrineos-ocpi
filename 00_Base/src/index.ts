// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { RoutingControllersOptions, useContainer } from 'routing-controllers';
import { Constructable, Container } from 'typedi';
import { OcpiModule } from './model/OcpiModule';
import { KoaServer } from './util/KoaServer';
import Koa from 'koa';
import { ICache } from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { CacheWrapper } from './util/CacheWrapper';
// import { SessionBroadcaster } from './broadcaster/SessionBroadcaster';
// import { CdrBroadcaster } from './broadcaster/CdrBroadcaster';
import { version } from '../../package.json';
import { OcpiConfig, OcpiConfigToken } from './config/ocpi.types';
import { IDtoModule } from './events';
import { OcpiGraphqlClient } from './graphql/OcpiGraphqlClient';

export * from './broadcaster';
export * from './mapper';
export * from './graphql';
export { Version } from './model/Version';
export { BodyWithSchema } from './util/decorators/BodyWithSchema';
export { plainToClass } from './util/Util';
export {
  OcpiErrorResponse,
  buildOcpiErrorResponse,
} from './model/OcpiErrorResponse';
export {
  AuthorizationInfo,
  AuthorizationInfoResponse,
} from './model/AuthorizationInfo';
export { TokensClientApi } from './trigger/TokensClientApi';
export { AuthorizationInfoAllowed } from './model/AuthorizationInfoAllowed';
export { PostTokenParams } from './trigger/param/tokens/PostTokenParams';
export { UnsuccessfulRequestException } from './exception/UnsuccessfulRequestException';
export { NotFoundException } from './exception/NotFoundException';
export { FunctionalEndpointParams } from './util/decorators/FunctionEndpointParams';
export { PaginatedOcpiParams } from './trigger/param/PaginatedOcpiParams';
export { OcpiParams } from './trigger/util/OcpiParams';
export {
  ChargingPreferences,
  ChargingPreferencesSchema,
  ChargingPreferencesSchemaName,
} from './model/ChargingPreferences';
export { PaginatedParams } from './controllers/param/PaginatedParams';
export { Paginated } from './util/decorators/Paginated';
export {
  OCPP_COMMAND_HANDLER,
  OCPPCommandHandler,
  OCPP1_6_CommandHandler,
  OCPP2_0_1_CommandHandler,
} from './util/ocppCommandHandlers';
export {
  ChargingPreferencesResponse,
  ChargingPreferencesResponseSchema,
  ChargingPreferencesResponseSchemaName,
} from './model/ChargingPreferencesResponse';
export {
  PaginatedSessionResponse,
  Session,
  PaginatedSessionResponseSchema,
  PaginatedSessionResponseSchemaName,
} from './model/Session';
export { Role } from './model/Role';
export { ImageCategory } from './model/ImageCategory';
export { ImageType } from './model/ImageType';
export { CountryCode } from './util/Util';
export { KoaServer } from './util/KoaServer';
export { InterfaceRole } from './model/InterfaceRole';
export { AlreadyRegisteredException } from './exception/AlreadyRegisteredException';
export { NotRegisteredException } from './exception/NotRegisteredException';
export { VersionsClientApi } from './trigger/VersionsClientApi';
// export { ChargingProfilesClientApi } from './trigger/ChargingProfilesClientApi';
export {
  CredentialsDTO,
  CredentialsDTOSchema,
  CredentialsDTOSchemaName,
} from './model/DTO/CredentialsDTO';
export {
  AdminCredentialsRequestDTO,
  AdminCredentialsRequestDTOSchema,
  AdminCredentialsRequestDTOSchemaName,
} from './model/DTO/AdminCredentialsRequestDTO';
export {
  SingleTokenRequest,
  SingleTokenRequestSchema,
  TokenDTO,
  TokenDTOSchema,
  TokenResponse,
  TokenResponseSchema,
  TokenResponseSchemaName,
  TokenDTOSchemaName,
} from './model/DTO/TokenDTO';

export { OcpiConfig, OcpiConfigInput } from './config/ocpi.types';
export { defineOcpiConfig } from './config/defineOcpiConfig';
export { getOcpiSystemConfig } from './config/loader';
export { ServerConfig, Env } from './config/ServerConfig';

export { CommandResponse } from './model/CommandResponse';
export { ActiveChargingProfile } from './model/ActiveChargingProfile';
export { ActiveChargingProfileResult } from './model/ActiveChargingProfileResult';
export { ClearChargingProfileResult } from './model/ChargingprofilesClearProfileResult';
export { ChargingProfileResponse } from './model/ChargingProfileResponse';
export { ChargingProfileResult } from './model/ChargingProfileResult';
export { ChargingProfileResultType } from './model/ChargingProfileResult';
export {
  generateMockForSchema,
  generateMockOcpiPaginatedResponse,
  BaseController,
} from './controllers/BaseController';
export {
  buildOcpiPaginatedResponse,
  DEFAULT_OFFSET,
  DEFAULT_LIMIT,
} from './model/PaginatedResponse';
export { CommandType } from './model/CommandType';
export {
  CancelReservation,
  CancelReservationSchema,
  CancelReservationSchemaName,
} from './model/CancelReservation';
export {
  ReserveNow,
  ReserveNowSchema,
  ReserveNowSchemaName,
} from './model/ReserveNow';
export {
  SetChargingProfile,
  SetChargingProfileSchema,
  SetChargingProfileSchemaName,
} from './model/SetChargingProfile';
export {
  StartSession,
  StartSessionSchema,
  StartSessionSchemaName,
} from './model/StartSession';
export {
  StopSession,
  StopSessionSchema,
  StopSessionSchemaName,
} from './model/StopSession';
export {
  UnlockConnector,
  UnlockConnectorSchema,
  UnlockConnectorSchemaName,
} from './model/UnlockConnector';
export { OcpiCommandResponse } from './model/CommandResponse';
export { ModuleId } from './model/ModuleId';
export {
  CredentialsResponse,
  CredentialsResponseSchema,
  CredentialsResponseSchemaName,
  buildCredentialsResponse,
} from './model/CredentialsResponse';
export {
  OcpiEmptyResponse,
  OcpiEmptyResponseSchema,
  OcpiEmptyResponseSchemaName,
  buildOcpiEmptyResponse,
} from './model/OcpiEmptyResponse';
export { OcpiStringResponse } from './model/OcpiStringResponse';
export { VersionNumber } from './model/VersionNumber';
export { VersionDetailsResponseDTO } from './model/DTO/VersionDetailsResponseDTO';
export {
  VersionListResponseDTO,
  VersionListResponseDTOSchema,
  VersionListResponseDTOSchemaName,
} from './model/DTO/VersionListResponseDTO';
export {
  TokenType,
  TokenTypeSchema,
  TokenTypeSchemaName,
} from './model/TokenType';
export { WhitelistType } from './model/WhitelistType';
export { VersionDetailsDTO } from './model/DTO/VersionDetailsDTO';
export { VersionDTO } from './model/DTO/VersionDTO';
export {
  OcpiResponseSchema,
  OcpiResponseStatusCode,
  buildOcpiResponse,
} from './model/OcpiResponse';
export { OcpiModule } from './model/OcpiModule';
export { CommandResultType } from './model/CommandResult';
export { EnumQueryParam } from './util/decorators/EnumQueryParam';
export { CommandResult } from './model/CommandResult';
export {
  LocationDTO,
  LocationResponse,
  PaginatedLocationResponse,
  LocationResponseSchema,
  LocationResponseSchemaName,
  PaginatedLocationResponseSchema,
  PaginatedLocationResponseSchemaName,
} from './model/DTO/LocationDTO';
export {
  EvseDTO,
  EvseResponse,
  UID_FORMAT,
  EXTRACT_EVSE_ID,
  EXTRACT_STATION_ID,
  EvseResponseSchema,
  EvseResponseSchemaName,
} from './model/DTO/EvseDTO';
export {
  ConnectorDTO,
  ConnectorResponse,
  TEMPORARY_CONNECTOR_ID,
  ConnectorResponseSchema,
  ConnectorResponseSchemaName,
} from './model/DTO/ConnectorDTO';
export { LocationMapper } from './mapper/LocationMapper';
export { TokensMapper } from './mapper/TokensMapper';
export { SessionMapper } from './mapper/SessionMapper';
export { AsOcpiFunctionalEndpoint } from './util/decorators/AsOcpiFunctionalEndpoint';
export { MultipleTypes } from './util/decorators/MultipleTypes';
export { OcpiNamespace } from './util/OcpiNamespace';
export { OcpiLogger } from './util/OcpiLogger';
export { AsOcpiRegistrationEndpoint } from './util/decorators/AsOcpiRegistrationEndpoint';
export { OcpiHeaders } from './model/OcpiHeaders';
export { AuthToken } from './util/decorators/AuthToken';
export { VersionNumberParam } from './util/decorators/VersionNumberParam';
export { EnumParam } from './util/decorators/EnumParam';
export { OcpiExceptionHandler } from './util/middleware/OcpiExceptionHandler';
export { InvalidParamException } from './exception/InvalidParamException';
export { MissingParamException } from './exception/MissingParamException';
export { UnknownTokenException } from './exception/UnknownTokenException';
export { WrongClientAccessException } from './exception/WrongClientAccessException';
export { ChargingProfilesService } from './services/ChargingProfilesService';
// export { AsyncResponder } from './util/AsyncResponder';
export { AsAdminEndpoint } from './util/decorators/AsAdminEndpoint';

export { MessageSenderWrapper } from './util/MessageSenderWrapper';
export { MessageHandlerWrapper } from './util/MessageHandlerWrapper';
export { CacheWrapper } from './util/CacheWrapper';
export { ResponseGenerator } from './util/response.generator';
export { versionIdParam } from './util/decorators/VersionNumberParam';
export {
  PutChargingProfileParams,
  buildPutChargingProfileParams,
} from './trigger/param/charging.profiles/PutChargingProfileParams';

export {
  AUTH_CONTROLLER_COMPONENT,
  EVSE_COMPONENT,
  CONNECTOR_COMPONENT,
  TOKEN_READER_COMPONENT,
  AVAILABILITY_STATE_VARIABLE,
  UNKNOWN_ID,
  NOT_APPLICABLE,
  CREATE,
  UPDATE,
} from './util/Consts';

export { ResponseSchema } from './openapi-spec-helper/decorators';
export { BaseClientApi } from './trigger/BaseClientApi';
export { LocationsClientApi } from './trigger/LocationsClientApi';

export { CommandsService } from './services/CommandsService';
export { CredentialsService } from './services/CredentialsService';
export { TokensService } from './services/TokensService';
// export { TokensAdminService } from './services/TokensAdminService';
export { LocationsService } from './services/LocationsService';
export { VersionService } from './services/VersionService';
export { SessionsService } from './services/SessionsService';
// export { AdminLocationsService } from './services/AdminLocationsService';

// Export AsyncJob types
export {
  AsyncJobStatusResponse,
  AsyncJobAction,
  AsyncJobRequest,
  AsyncJobName,
  AsyncJobPaginatedParams,
} from './types/asyncJob.types';

export { TariffsService } from './services/TariffsService';
export { TariffMapper } from './mapper/TariffMapper';

export { OcpiHttpHeader } from './util/OcpiHttpHeader';

export { CdrsService } from './services/CdrsService';
export { PaginatedCdrResponse } from './model/Cdr';
export { BaseBroadcaster } from './broadcaster/BaseBroadcaster';
export {
  PaginatedTariffResponse,
  TariffDTO,
  PaginatedTariffResponseSchema,
  PaginatedTariffResponseSchemaName,
} from './model/DTO/tariffs/TariffDTO';
export { BodyWithExample } from './util/decorators/BodyWithExample';
export { CommandExecutor } from './util/CommandExecutor';
export {
  PutTariffRequest,
  PutTariffRequestSchema,
  PutTariffRequestSchemaName,
} from './model/DTO/tariffs/PutTariffRequest';
export {
  AdminLocationDTO,
  AdminEvseDTO,
  AdminConnectorDTO,
} from './model/DTO/admin/AdminLocationDTO';
export {
  ChargingStationVariableAttributes,
  CONSTRUCT_CHARGING_STATION_VARIABLE_ATTRIBUTES_QUERY,
} from './model/variableattributes/ChargingStationVariableAttributes';
export {
  EvseVariableAttributes,
  CONSTRUCT_EVSE_VARIABLE_ATTRIBUTES_QUERY,
} from './model/variableattributes/EvseVariableAttributes';
export {
  ConnectorVariableAttributes,
  CONSTRUCT_CONNECTOR_VARIABLE_ATTRIBUTES_QUERY,
} from './model/variableattributes/ConnectorVariableAttributes';
export {
  UnregisterClientRequestDTOSchema,
  UnregisterClientRequestDTO,
  UnregisterClientRequestDTOSchemaName,
} from './model/UnregisterClientRequestDTO';
export * from './events';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { HealthController } from './util/KoaServerHealthController';

useContainer(Container);

export { Container } from 'typedi';
export { getDtoEventHandlerMetaData } from './events/AsDtoEventHandler';
export { LocationsBroadcaster } from './broadcaster/LocationsBroadcaster';

export class OcpiServer extends KoaServer {
  koa!: Koa;
  private readonly ocpiConfig: OcpiConfig;
  private readonly cache: ICache;
  private readonly logger: Logger<ILogObj>;
  private _modules: (OcpiModule | IDtoModule)[] = [];
  get modules(): (OcpiModule | IDtoModule)[] {
    return this._modules;
  }

  private moduleList: Constructable<OcpiModule | IDtoModule>[] = [];

  constructor(
    ocpiConfig: OcpiConfig,
    cache: ICache,
    logger: Logger<ILogObj>,
    moduleList: Constructable<OcpiModule | IDtoModule>[],
  ) {
    super();

    this.ocpiConfig = ocpiConfig;
    this.cache = cache;
    this.logger = logger;
    this.moduleList = moduleList;
    this.initContainer();
  }

  public async initialize() {
    for (const moduleListElement of this.moduleList) {
      const constructedModule = Container.get(moduleListElement) as OcpiModule &
        IDtoModule;
      if (constructedModule) {
        if (constructedModule.init) {
          await constructedModule.init();
        }
        if (constructedModule.initHandlers) {
          await constructedModule.initHandlers();
        }
        this._modules.push(constructedModule);
      }
    }
    this.initKoaServer();
  }

  private initKoaServer() {
    try {
      this.koa = new Koa();
      const controllers = this._modules.map((module) =>
        (module as OcpiModule).getController(),
      );
      const options: RoutingControllersOptions = {
        controllers: [...controllers, HealthController],
        routePrefix: '/ocpi',
        middlewares: [],
        defaultErrorHandler: false,
      } as RoutingControllersOptions;
      this.initApp(options);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.initKoaSwagger(
        {
          title: 'CitrineOS OCPI 2.2.1',
          version: version,
        },
        [
          {
            url: '/ocpi',
          },
        ],
      );
      this.run(
        this.ocpiConfig.ocpiServer.host,
        this.ocpiConfig.ocpiServer.port,
      );
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }

  private initContainer() {
    Container.set(OcpiConfigToken, this.ocpiConfig);
    Container.set(CacheWrapper, new CacheWrapper(this.cache));
    Container.set(Logger, this.logger);

    Container.set(
      OcpiGraphqlClient,
      new OcpiGraphqlClient(
        this.ocpiConfig.graphql.endpoint,
        this.ocpiConfig.graphql.headers,
      ),
    );

    const ajv = new Ajv({
      removeAdditional: 'all',
      useDefaults: true,
      coerceTypes: 'array',
      strict: false,
    });
    addFormats(ajv, {
      mode: 'fast',
      formats: ['date-time'],
    });
    Container.set(Ajv, ajv);

    this.onContainerInitialized();
  }

  private onContainerInitialized() {
    // Container.get(SessionBroadcaster); // init session broadcaster
    // Container.get(CdrBroadcaster);
  }
}

export { OcpiConfigToken };

export {
  CommandResponseSchema,
  CommandResponseSchemaName,
} from './model/CommandResponse';
export { ChargingProfileResponseSchemaName } from './model/ChargingProfileResponse';
export { ChargingProfileResponseSchema } from './model/ChargingProfileResponse';

export {
  PaginatedCdrResponseSchema,
  PaginatedCdrResponseSchemaName,
} from './model/Cdr';
