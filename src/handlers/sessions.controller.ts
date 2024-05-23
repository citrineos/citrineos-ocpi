import {Body, Controller, Get, Param, Put} from 'routing-controllers';
import {OcpiModules} from '../trigger/BaseApi';
import {BaseController} from './base.controller';
import {AsOcpiEndpoint} from '../util/decorators/as.ocpi.endpoint';
import {ResponseSchema} from '../openapi-spec-helper';
import {PaginatedSessionResponse} from '../model/Session';
import {HttpStatus} from '@citrineos/base';
import {ChargingPreferencesResponse} from '../model/ChargingPreferencesResponse';
import {ChargingPreferences} from '../model/ChargingPreferences';
import {Service} from 'typedi';
import {PaginatedParams} from '../trigger/param/paginated.params';
import {Paginated} from "../util/decorators/paginated";

@Controller(`/${OcpiModules.Sessions}`)
@Service()
export class SessionsController extends BaseController {

  @Get()
  @AsOcpiEndpoint()
  @ResponseSchema(PaginatedSessionResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getSessions(
    @Paginated() paginationParams?: PaginatedParams,
  ): Promise<PaginatedSessionResponse> {
    console.log('getSessions', paginationParams);
    return await this.generateMockOcpiPaginatedResponse(PaginatedSessionResponse, paginationParams);
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
