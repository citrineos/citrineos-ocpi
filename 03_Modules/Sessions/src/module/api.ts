// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ISessionsModuleApi } from './interface';

import { Body, Get, JsonController, Param, Put } from 'routing-controllers';
import { HttpStatus } from '@citrineos/base';
import {
  AsOcpiFunctionalEndpoint,
  BaseController,
  ChargingPreferences,
  ChargingPreferencesResponse,
  FunctionalEndpointParams,
  generateMockOcpiPaginatedResponse,
  generateMockOcpiResponse,
  ModuleId,
  OcpiHeaders,
  Paginated,
  PaginatedParams,
  PaginatedSessionResponse,
  ResponseSchema,
  SessionsService,
  versionIdParam,
  VersionNumber,
  VersionNumberParam,
} from '@citrineos/ocpi-base';

import { Service } from 'typedi';

const MOCK_PAGINATED_SESSIONS = generateMockOcpiPaginatedResponse(
  PaginatedSessionResponse,
  new PaginatedParams(),
);
const MOCK_CHARGING_PREFERENCES = generateMockOcpiResponse(
  ChargingPreferencesResponse,
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
  @ResponseSchema(PaginatedSessionResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_PAGINATED_SESSIONS,
    },
  })
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
  @ResponseSchema(ChargingPreferencesResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_CHARGING_PREFERENCES,
    },
  })
  async updateChargingPreferences(
    @Param('sessionId') sessionId: string,
    @Body() body: ChargingPreferences,
  ): Promise<ChargingPreferencesResponse> {
    console.log('updateChargingPreferences', sessionId, body);
    return MOCK_CHARGING_PREFERENCES;
  }
}
