import { Body, Controller, Get, Param, Post, Put } from 'routing-controllers';
import { BaseController, generateMockOcpiResponse } from './base.controller';
import { HttpStatus } from '@citrineos/base';
import { ActiveChargingProfileResult } from '../model/ActiveChargingProfileResult';
import { ActiveChargingProfile } from '../model/ActiveChargingProfile';
import { OcpiEmptyResponse } from '../model/ocpi.empty.response';
import { AsOcpiFunctionalEndpoint } from '../util/decorators/as.ocpi.functional.endpoint';
import { ClearChargingProfileResult } from '../model/ChargingprofilesClearProfileResult';
import { ChargingProfileResult } from '../model/ChargingProfileResult';
import { ResponseSchema } from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { ModuleId } from '../model/ModuleId';
import { OcpiResponse } from '@citrineos/ocpi-base';
import { ChargingProfileResponse } from '../model/ChargingProfileResponse';

@Controller(`/${ModuleId.ChargingProfiles}`)
@Service()
export class ChargingProfilesController extends BaseController {
  constructor() {
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
    @Param('sessionId') _sessionId: string,
  ): Promise<OcpiResponse<ChargingProfileResponse>> {
    return generateMockOcpiResponse(OcpiResponse<ChargingProfileResponse>);
  }
}
