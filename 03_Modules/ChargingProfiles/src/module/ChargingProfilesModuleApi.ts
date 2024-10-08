// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { IChargingProfilesModuleApi } from './IChargingProfilesModuleApi';

import {
  Body,
  Delete,
  Get,
  JsonController,
  Param,
  Put,
  QueryParam,
} from 'routing-controllers';

import { HttpStatus } from '@citrineos/base';
import {
  AsOcpiFunctionalEndpoint,
  BaseController,
  ChargingProfileResponse,
  ChargingProfilesService,
  generateMockOcpiResponse,
  ModuleId,
  OcpiResponse,
  ResponseSchema,
  SetChargingProfile,
  versionIdParam,
} from '@citrineos/ocpi-base';

import { Service } from 'typedi';

@JsonController(`/:${versionIdParam}/${ModuleId.ChargingProfiles}`)
@Service()
export class ChargingProfilesModuleApi
  extends BaseController
  implements IChargingProfilesModuleApi
{
  constructor(readonly service: ChargingProfilesService) {
    super();
  }

  @Get('/:sessionId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiResponse<ChargingProfileResponse>, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(OcpiResponse<ChargingProfileResponse>),
    },
  })
  async getActiveChargingProfile(
    @Param('sessionId') sessionId: string,
    @QueryParam('duration', { required: true }) duration: number,
    @QueryParam('response_url', { required: true }) responseUrl: string,
  ): Promise<OcpiResponse<ChargingProfileResponse>> {
    return this.service.getActiveChargingProfile(
      sessionId,
      duration,
      responseUrl,
    );
  }

  @Delete('/:sessionId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiResponse<ChargingProfileResponse>, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(OcpiResponse<ChargingProfileResponse>),
    },
  })
  async deleteChargingProfile(
    @Param('sessionId') sessionId: string,
    @QueryParam('response_url', { required: true }) responseUrl: string,
  ): Promise<OcpiResponse<ChargingProfileResponse>> {
    return this.service.deleteChargingProfile(sessionId, responseUrl);
  }

  @Put('/:sessionId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiResponse<ChargingProfileResponse>, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(OcpiResponse<ChargingProfileResponse>),
    },
  })
  async updateChargingProfile(
    @Param('sessionId') sessionId: string,
    @Body() payload: SetChargingProfile,
  ): Promise<OcpiResponse<ChargingProfileResponse>> {
    return this.service.putChargingProfile(sessionId, payload);
  }
}
