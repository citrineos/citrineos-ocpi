import {Controller, Get, Param, QueryParam} from 'routing-controllers';
import {OcpiModules} from '../trigger/BaseApi';
import {BaseController} from './base.controller';
import {AsOcpiEndpoint} from '../util/decorators/as.ocpi.endpoint';
import {HttpStatus} from '@citrineos/base';
import {LocationResponse, PaginatedLocationResponse} from '../model/Location';
import {EvseResponse} from '../model/Evse';
import {ConnectorResponse} from '../model/Connector';
import {ResponseSchema} from '../openapi-spec-helper';
import {Service} from 'typedi';
import {PaginatedParams} from '../trigger/param/paginated.params';
import {Paginated} from "../util/decorators/paginated";
import { LocationsService } from '../service/locations.service';
import { IsDate } from 'class-validator';

@Controller(`/${OcpiModules.Locations}`)
@Service()
export class LocationsController extends BaseController {

  constructor(readonly locationsService: LocationsService) {
    super();
  }

  @Get()
  @AsOcpiEndpoint()
  @ResponseSchema(PaginatedLocationResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getLocations(
    @Paginated() paginatedParams?: PaginatedParams,
  ): Promise<PaginatedLocationResponse> {
    console.log('getLocations', paginatedParams);
    // return await this.generateMockOcpiPaginatedResponse(PaginatedLocationResponse, paginationParams);
    return await this.locationsService.getLocations(paginatedParams);

  }

  @Get('/:locationId')
  @AsOcpiEndpoint()
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
  @AsOcpiEndpoint()
  @ResponseSchema(EvseResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getEvse(
    @Param('locationId') _locationId: string,
    @Param('evseId') _evseId: string,
  ): Promise<EvseResponse> {
    console.log('getEvse', _locationId, _evseId);
    return this.locations
    // return this.generateMockOcpiResponse(EvseResponse);
  }

  @Get('/:id/:evseId/:connectorId')
  @AsOcpiEndpoint()
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