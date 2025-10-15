// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { IChargingProfilesModuleApi } from './IChargingProfilesModuleApi';

import {
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
  BodyWithSchema,
  ChargingProfileResponse,
  ChargingProfileResponseSchema,
  ChargingProfileResponseSchemaName,
  ChargingProfilesService,
  generateMockForSchema,
  ModuleId,
  ResponseSchema,
  SetChargingProfile,
  SetChargingProfileSchema,
  SetChargingProfileSchemaName,
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
  @ResponseSchema(
    ChargingProfileResponseSchema,
    ChargingProfileResponseSchemaName,
    {
      statusCode: HttpStatus.OK,
      description: 'Successful response',
      examples: {
        success: generateMockForSchema(
          ChargingProfileResponseSchema,
          ChargingProfileResponseSchemaName,
        ),
      },
    },
  )
  async getActiveChargingProfile(
    @Param('sessionId') sessionId: string,
    @QueryParam('duration', { required: true }) duration: number,
    @QueryParam('response_url', { required: true }) responseUrl: string,
  ): Promise<ChargingProfileResponse> {
    return this.service.getActiveChargingProfile(
      sessionId,
      duration,
      responseUrl,
    );
  }

  @Delete('/:sessionId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(
    ChargingProfileResponseSchema,
    ChargingProfileResponseSchemaName,
    {
      statusCode: HttpStatus.OK,
      description: 'Successful response',
      examples: {
        success: generateMockForSchema(
          ChargingProfileResponseSchema,
          ChargingProfileResponseSchemaName,
        ),
      },
    },
  )
  async deleteChargingProfile(
    @Param('sessionId') sessionId: string,
    @QueryParam('response_url', { required: true }) responseUrl: string,
  ): Promise<ChargingProfileResponse> {
    return this.service.deleteChargingProfile(sessionId, responseUrl);
  }

  @Put('/:sessionId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(
    ChargingProfileResponseSchema,
    ChargingProfileResponseSchemaName,
    {
      statusCode: HttpStatus.OK,
      description: 'Successful response',
      examples: {
        success: generateMockForSchema(
          ChargingProfileResponseSchema,
          ChargingProfileResponseSchemaName,
        ),
      },
    },
  )
  async updateChargingProfile(
    @Param('sessionId') sessionId: string,
    @BodyWithSchema(SetChargingProfileSchema, SetChargingProfileSchemaName)
    payload: SetChargingProfile,
  ): Promise<ChargingProfileResponse> {
    return this.service.putChargingProfile(sessionId, payload);
  }
}
