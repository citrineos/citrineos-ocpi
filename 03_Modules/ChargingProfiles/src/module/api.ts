// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0


import {IChargingProfilesModuleApi} from './interface';

import {Body, Controller, Get, Param, Put, QueryParam} from 'routing-controllers';

import {HttpStatus} from '@citrineos/base';
import {
    AsOcpiFunctionalEndpoint,
    BaseController,
    generateMockOcpiResponse,
    ModuleId,
    ResponseSchema,
    OcpiResponse, ChargingProfilesService,
    SetChargingProfile
} from '@citrineos/ocpi-base';

import {Service} from 'typedi';
import {ChargingProfileResponse} from "@citrineos/ocpi-base";

@Controller(`/${ModuleId.ChargingProfiles}`)
@Service()
export class ChargingProfilesModuleApi extends BaseController implements IChargingProfilesModuleApi {
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
        @QueryParam("duration") duration: number,
        @QueryParam("response_url") responseUrl: string,
    ): Promise<OcpiResponse<ChargingProfileResponse>> {
        return this.service.getActiveChargingProfile(sessionId, duration, responseUrl);
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
