import {
  ActiveChargingProfile,
  ActiveChargingProfileResult,
  Body,
  ChargingProfileResult,
  ClearChargingProfileResult,
  JsonController,
  ModuleId,
  OcpiEmptyResponse,
  Param,
  Post,
  Put,
  ResponseSchema,
  VersionNumber,
} from '@citrineos/ocpi-base';
import { BaseController, generateMockOcpiResponse } from './base.controller';
import { HttpStatus } from '@citrineos/base';
import { AsOcpiFunctionalEndpoint } from '../util/decorators/as.ocpi.functional.endpoint';
import { Service } from 'typedi';
import {
  versionIdParam,
  VersionNumberParam,
} from '../util/decorators/version.number.param';

const MOCK = generateMockOcpiResponse(OcpiEmptyResponse);

@JsonController(`/:${versionIdParam}/${ModuleId.Chargingprofiles}`)
@Service()
export class ChargingProfilesController extends BaseController {
  @Post('/:id')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK,
      },
    },
  })
  async postGenericChargingProfileResult(
    @VersionNumberParam() _version: VersionNumber,
    @Param('id') _id: string,
    @Body()
    _activeChargingProfileResult:
      | ActiveChargingProfileResult
      | ChargingProfileResult
      | ClearChargingProfileResult,
  ): Promise<OcpiEmptyResponse> {
    return MOCK;
  }

  @Put('/:sessionId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK,
      },
    },
  })
  async putSenderChargingProfile(
    @VersionNumberParam() _version: VersionNumber,
    @Param('sessionId') _sessionId: string,
    @Body() _activeChargingProfile: ActiveChargingProfile,
  ): Promise<OcpiEmptyResponse> {
    return MOCK;
  }
}
