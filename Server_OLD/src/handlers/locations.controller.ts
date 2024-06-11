import {Get, JsonController, Param} from 'routing-controllers';
import {BaseController, generateMockOcpiPaginatedResponse, generateMockOcpiResponse,} from './base.controller';
import {AsOcpiFunctionalEndpoint} from '../util/decorators/as.ocpi.functional.endpoint';
import {HttpStatus} from '@citrineos/base';
import {LocationResponse, PaginatedLocationResponse} from '../model/Location';
import {EvseResponse} from '../model/Evse';
import {ConnectorResponse} from '../model/Connector';
import {Service} from 'typedi';
import {PaginatedParams} from './param/paginated.params';
import {Paginated} from '../util/decorators/paginated';
import {ModuleId} from '../model/ModuleId';
import {versionIdParam, VersionNumberParam} from "../util/decorators/version.number.param";
import {VersionNumber} from "../model/VersionNumber";
import {ResponseSchema} from '../../../00_Base/src/openapi-spec-helper';

const MOCK_PAGINATED_LOCATION = generateMockOcpiPaginatedResponse(
  PaginatedLocationResponse,
  new PaginatedParams(),
);
const MOCK_LOCATION = generateMockOcpiResponse(LocationResponse);
const MOCK_EVSE = generateMockOcpiResponse(EvseResponse);
const MOCK_CONNECTOR = generateMockOcpiResponse(ConnectorResponse);

@JsonController(`/:${versionIdParam}/${ModuleId.Locations}`)
@Service()
export class LocationsController extends BaseController {
  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(PaginatedLocationResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_PAGINATED_LOCATION
      },
    },
  })
  async getLocations(
    @VersionNumberParam() _version: VersionNumber,
    @Paginated() paginationParams?: PaginatedParams,
  ): Promise<PaginatedLocationResponse> {
    console.log('getLocations', paginationParams);
    return MOCK_PAGINATED_LOCATION;
  }

  @Get('/:locationId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(LocationResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_LOCATION
      },
    },
  })
  async getLocation(
    @VersionNumberParam() _version: VersionNumber,
    @Param('locationId') _locationId: string,
  ): Promise<LocationResponse> {
    console.log('getLocation', _locationId);
    return MOCK_LOCATION;
  }

  @Get('/:id/:evseId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(EvseResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_EVSE
      },
    },
  })
  async getEvse(
    @VersionNumberParam() _version: VersionNumber,
    @Param('locationId') _locationId: string,
    @Param('evseId') _evseId: string,
  ): Promise<EvseResponse> {
    console.log('getEvse', _locationId, _evseId);
    return MOCK_EVSE;
  }

  @Get('/:id/:evseId/:connectorId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(ConnectorResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_CONNECTOR
      },
    },
  })
  async getConnector(
    @VersionNumberParam() _version: VersionNumber,
    @Param('locationId') _locationId: string,
    @Param('evseId') _evseId: string,
    @Param('connectorId') _connectorId: string,
  ): Promise<ConnectorResponse> {
    console.log('getConnector', _locationId, _evseId, _connectorId);
    return MOCK_CONNECTOR;
  }
}
