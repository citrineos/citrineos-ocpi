import {Body, Get, JsonController, Param, Put} from 'routing-controllers';
import {BaseController, generateMockOcpiPaginatedResponse, generateMockOcpiResponse,} from './base.controller';
import {AsOcpiFunctionalEndpoint} from '../util/decorators/as.ocpi.functional.endpoint';
import {PaginatedSessionResponse} from '../model/Session';
import {HttpStatus} from '@citrineos/base';
import {ChargingPreferencesResponse} from '../model/ChargingPreferencesResponse';
import {ChargingPreferences} from '../model/ChargingPreferences';
import {Service} from 'typedi';
import {PaginatedParams} from './param/paginated.params';
import {Paginated} from '../util/decorators/paginated';
import {ModuleId} from '../model/ModuleId';
import {versionIdParam, VersionNumberParam} from "../util/decorators/version.number.param";
import {VersionNumber} from "../model/VersionNumber";
import {ResponseSchema} from '../../../00_Base/src/openapi-spec-helper';

const MOCK_PAGINATED_SESSIONS = generateMockOcpiPaginatedResponse(
  PaginatedSessionResponse,
  new PaginatedParams(),
);
const MOCK_CHARGING_PREFERENCES = generateMockOcpiResponse(
  ChargingPreferencesResponse,
);

@JsonController(`/:${versionIdParam}/${ModuleId.Sessions}`)
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
    @VersionNumberParam() _version: VersionNumber,
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
    @VersionNumberParam() _version: VersionNumber,
    @Param('sessionId') sessionId: string,
    @Body() body: ChargingPreferences,
  ): Promise<ChargingPreferencesResponse> {
    console.log('updateChargingPreferences', sessionId, body);
    return MOCK_CHARGING_PREFERENCES;
  }
}
