import {Body, Controller, Get, Param, Put, QueryParams} from 'routing-controllers';
import {OcpiModules} from '../trigger/BaseApi';
import {BaseController} from './base.controller';
import {AsOcpiEndpoint} from '../util/decorators/as.ocpi.endpoint';
import {ResponseSchema} from '../openapi-spec-helper';
import {SessionListResponse} from '../model/Session';
import {HttpStatus} from '@citrineos/base';
import {ChargingPreferencesResponse} from '../model/ChargingPreferencesResponse';
import {ChargingPreferences} from '../model/ChargingPreferences';
import {Service} from 'typedi';
import {PaginatedParams} from '../trigger/param/paginated.params';

@Controller(`/${OcpiModules.Sessions}`)
@Service()
export class SessionsController extends BaseController {

  // todo pg 90 https://evroaming.org/app/uploads/2021/11/OCPI-2.2.1.pdf
  // todo This request is paginated, it supports the pagination related URL parameters
  @Get()
  @AsOcpiEndpoint()
  @ResponseSchema(SessionListResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getSessions(
    @QueryParams() _query?: PaginatedParams,
  ): Promise<SessionListResponse> {
    console.log('getSessions', _query);
    return this.generateMockOcpiResponse(SessionListResponse);
  }

  @Put('/{sessionId}/charging_preferences')
  @AsOcpiEndpoint()
  @ResponseSchema(ChargingPreferencesResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async updateChargingPreferences(
    @Param('sessionId') sessionId: string,
    @Body() body: ChargingPreferences
  ): Promise<ChargingPreferencesResponse> {
    console.log('updateChargingPreferences', sessionId, body);
    return this.generateMockOcpiResponse(ChargingPreferencesResponse);
  }

}
