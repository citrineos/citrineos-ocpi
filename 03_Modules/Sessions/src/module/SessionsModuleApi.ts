// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { ISessionsModuleApi } from './ISessionsModuleApi';

import { Get, JsonController, Param, Put } from 'routing-controllers';
import { HttpStatus } from '@citrineos/base';
import {
  AsOcpiFunctionalEndpoint,
  BaseController,
  BodyWithSchema,
  ChargingPreferences,
  ChargingPreferencesResponse,
  ChargingPreferencesResponseSchema,
  ChargingPreferencesResponseSchemaName,
  ChargingPreferencesSchema,
  ChargingPreferencesSchemaName,
  FunctionalEndpointParams,
  generateMockForSchema,
  generateMockOcpiPaginatedResponse,
  ModuleId,
  OcpiHeaders,
  Paginated,
  PaginatedParams,
  PaginatedSessionResponse,
  PaginatedSessionResponseSchema,
  PaginatedSessionResponseSchemaName,
  ResponseSchema,
  SessionsService,
  versionIdParam,
  VersionNumber,
  VersionNumberParam,
} from '@citrineos/ocpi-base';

import { Service } from 'typedi';

const MOCK_PAGINATED_SESSIONS = generateMockOcpiPaginatedResponse(
  PaginatedSessionResponseSchema,
  PaginatedSessionResponseSchemaName,
  new PaginatedParams(),
);
const MOCK_CHARGING_PREFERENCES = generateMockForSchema(
  ChargingPreferencesResponseSchema,
  ChargingPreferencesResponseSchemaName,
);

@JsonController(`/:${versionIdParam}/${ModuleId.Sessions}`)
@Service()
export class SessionsModuleApi
  extends BaseController
  implements ISessionsModuleApi
{
  constructor(readonly sessionsService: SessionsService) {
    super();
  }

  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(
    PaginatedSessionResponseSchema,
    PaginatedSessionResponseSchemaName,
    {
      statusCode: HttpStatus.OK,
      description: 'Successful response',
      examples: {
        success: MOCK_PAGINATED_SESSIONS,
      },
    },
  )
  async getSessions(
    @VersionNumberParam() versionNumber: VersionNumber,
    @Paginated() paginatedParams?: PaginatedParams,
    @FunctionalEndpointParams() ocpiHeaders?: OcpiHeaders,
  ): Promise<PaginatedSessionResponse> {
    return this.sessionsService.getSessions(
      ocpiHeaders!.fromCountryCode,
      ocpiHeaders!.fromPartyId,
      ocpiHeaders!.toCountryCode,
      ocpiHeaders!.toPartyId,
      paginatedParams?.dateFrom,
      paginatedParams?.dateTo,
      paginatedParams?.offset,
      paginatedParams?.limit,
    );
  }

  @Put('/{sessionId}/charging_preferences')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(
    ChargingPreferencesResponseSchema,
    ChargingPreferencesResponseSchemaName,
    {
      statusCode: HttpStatus.OK,
      description: 'Successful response',
      examples: {
        success: MOCK_CHARGING_PREFERENCES,
      },
    },
  )
  async updateChargingPreferences(
    @Param('sessionId') sessionId: string,
    @BodyWithSchema(ChargingPreferencesSchema, ChargingPreferencesSchemaName)
    body: ChargingPreferences,
  ): Promise<ChargingPreferencesResponse> {
    console.log('updateChargingPreferences', sessionId, body);
    return MOCK_CHARGING_PREFERENCES;
  }
}
