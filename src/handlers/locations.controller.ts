import {Controller, Get, Param} from 'routing-controllers';
import {OcpiModules} from '../trigger/BaseApi';
import {BaseController} from './base.controller';
import {AsOcpiFunctionalEndpoint} from '../util/decorators/as.ocpi.functional.endpoint';
import {HttpStatus} from '@citrineos/base';
import {LocationResponse, PaginatedLocationResponse} from '../model/Location';
import {EvseResponse} from '../model/Evse';
import {ConnectorResponse} from '../model/Connector';
import {ResponseSchema} from '../openapi-spec-helper';
import {Service} from 'typedi';
import {PaginatedParams} from '../trigger/param/paginated.params';
import {Paginated} from '../util/decorators/paginated';

@Controller(`/${OcpiModules.Locations}`)
@Service()
export class LocationsController extends BaseController {

  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(PaginatedLocationResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getLocations(
    @Paginated() paginationParams?: PaginatedParams,
  ): Promise<PaginatedLocationResponse> {
    console.log('getLocations', paginationParams);
    return await this.generateMockOcpiPaginatedResponse(PaginatedLocationResponse, paginationParams);
  }

  @Get('/:locationId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(LocationResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getLocation(
    @Param('locationId') _locationId: string
  ): Promise<LocationResponse> {
    console.log('getLocation', _locationId);
    return this.generateMockOcpiResponse(LocationResponse);
  }

  @Get('/:id/:evseId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(EvseResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getEvse(
    @Param('locationId') _locationId: string,
    @Param('evseId') _evseId: string,
  ): Promise<EvseResponse> {
    console.log('getEvse', _locationId, _evseId);
    return this.generateMockOcpiResponse(EvseResponse);
  }

  @Get('/:id/:evseId/:connectorId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(ConnectorResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getConnector(
    @Param('locationId') _locationId: string,
    @Param('evseId') _evseId: string,
    @Param('connectorId') _connectorId: string
  ): Promise<ConnectorResponse> {
    console.log('getConnector', _locationId, _evseId, _connectorId);
    return this.generateMockOcpiResponse(ConnectorResponse);
  }
}
