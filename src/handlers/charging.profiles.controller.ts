import {Body, Controller, Param, Post, Put} from 'routing-controllers';
import {BaseController} from './base.controller';
import {HttpStatus} from '@citrineos/base';
import {ActiveChargingProfileResult} from '../model/ActiveChargingProfileResult';
import {ActiveChargingProfile} from '../model/ActiveChargingProfile';
import {OcpiEmptyResponse} from '../model/ocpi.empty.response';
import {AsOcpiFunctionalEndpoint} from '../util/decorators/as.ocpi.functional.endpoint';
import {ClearChargingProfileResult} from '../model/ChargingprofilesClearProfileResult';
import {ChargingProfileResult} from '../model/ChargingProfileResult';
import {ResponseSchema} from '../openapi-spec-helper';
import {Service} from 'typedi';
import {ModuleId} from "../model/ModuleId";

@Controller(`/${ModuleId.Chargingprofiles}`)
@Service()
export class ChargingProfilesController extends BaseController {
  @Post('/:id')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async postGenericChargingProfileResult(
    @Param('id') _id: string,
    @Body() _activeChargingProfileResult: ActiveChargingProfileResult | ChargingProfileResult | ClearChargingProfileResult
  ): Promise<OcpiEmptyResponse> {
    return this.generateMockOcpiResponse(OcpiEmptyResponse);
  }

  @Put('/:sessionId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async putSenderChargingProfile(
    @Param('sessionId') _sessionId: string,
    @Body() _activeChargingProfile: ActiveChargingProfile,
  ): Promise<OcpiEmptyResponse> {
    return this.generateMockOcpiResponse(OcpiEmptyResponse);
  }
}
