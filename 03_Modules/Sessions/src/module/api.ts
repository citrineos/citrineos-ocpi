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
  generateMockOcpiPaginatedResponse,
  generateMockOcpiResponse,
  ModuleId,
  Paginated,
  PaginatedOcpiParams,
  PaginatedParams,
  PaginatedSessionResponse,
  ResponseSchema,
  SessionsService,
} from '@citrineos/ocpi-base';

import { Service } from 'typedi';

const MOCK_PAGINATED_SESSIONS = generateMockOcpiPaginatedResponse(
  PaginatedSessionResponse,
  new PaginatedParams(),
);
const MOCK_CHARGING_PREFERENCES = generateMockOcpiResponse(
  ChargingPreferencesResponse,
);

@JsonController(`/${ModuleId.Sessions}`)
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
    @Paginated() paginationParams?: PaginatedOcpiParams,
  ): Promise<PaginatedSessionResponse> {
    console.info(
      paginationParams?.date_from,
      paginationParams?.fromCountryCode,
      paginationParams?.fromPartyId,
      paginationParams?.toCountryCode,
      paginationParams?.toPartyId,
    );
    return this.sessionsService.getSessions(
      paginationParams!.fromCountryCode,
      paginationParams!.fromPartyId,
      paginationParams!.toCountryCode,
      paginationParams!.toPartyId,
      paginationParams!.date_from,
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
