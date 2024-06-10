import { Body, Controller, Get, Param, Put } from 'routing-controllers';
import {
  BaseController,
  generateMockOcpiPaginatedResponse,
  generateMockOcpiResponse,
} from './base.controller';
import { AsOcpiFunctionalEndpoint } from '../util/decorators/as.ocpi.functional.endpoint';
import { ResponseSchema } from '../openapi-spec-helper';
import { PaginatedSessionResponse } from '../model/Session';
import { HttpStatus } from '@citrineos/base';
import { ChargingPreferencesResponse } from '../model/ChargingPreferencesResponse';
import { ChargingPreferences } from '../model/ChargingPreferences';
import { Service } from 'typedi';
import { PaginatedParams } from './param/paginated.params';
import { Paginated } from '../util/decorators/paginated';
import { ModuleId } from '../model/ModuleId';

const MOCK_PAGINATED_SESSIONS = generateMockOcpiPaginatedResponse(
  PaginatedSessionResponse,
  new PaginatedParams(),
);
const MOCK_CHARGING_PREFERENCES = generateMockOcpiResponse(
  ChargingPreferencesResponse,
);

@Controller(`/${ModuleId.Sessions}`)
@Service()
export class SessionsController extends BaseController {
  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(PaginatedSessionResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_PAGINATED_SESSIONS
      },
    },
  })
  async getSessions(
    @Paginated() paginationParams?: PaginatedParams,
  ): Promise<PaginatedSessionResponse> {
    console.log('getSessions', paginationParams);
    return MOCK_PAGINATED_SESSIONS;
  }

  @Put('/{sessionId}/charging_preferences')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(ChargingPreferencesResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_CHARGING_PREFERENCES
      },
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
