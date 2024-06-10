import {Controller, Get, Param} from 'routing-controllers';
import {BaseController, generateMockOcpiPaginatedResponse, generateMockOcpiResponse,} from './base.controller';
import {AsOcpiFunctionalEndpoint} from '../util/decorators/as.ocpi.functional.endpoint';
import {HttpStatus} from '@citrineos/base';
import {LocationResponse, PaginatedLocationResponse} from '../model/Location';
import {EvseResponse} from '../model/Evse';
import {ConnectorResponse} from '../model/Connector';
import {ResponseSchema} from '../openapi-spec-helper';
import {Service} from 'typedi';
import {PaginatedParams} from './param/paginated.params';
import {Paginated} from '../util/decorators/paginated';
import {ModuleId} from '../model/ModuleId';

const MOCK_PAGINATED_LOCATION = generateMockOcpiPaginatedResponse(
  PaginatedLocationResponse,
  new PaginatedParams(),
);
const MOCK_LOCATION = generateMockOcpiResponse(LocationResponse);
const MOCK_EVSE = generateMockOcpiResponse(EvseResponse);
const MOCK_CONNECTOR = generateMockOcpiResponse(ConnectorResponse);

@Controller(`/${ModuleId.Locations}`)
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
    @Param('locationId') _locationId: string,
    @Param('evseId') _evseId: string,
    @Param('connectorId') _connectorId: string,
  ): Promise<ConnectorResponse> {
    console.log('getConnector', _locationId, _evseId, _connectorId);
    return MOCK_CONNECTOR;
  }
}
