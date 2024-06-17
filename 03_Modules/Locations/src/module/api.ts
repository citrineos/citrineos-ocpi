// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Body, Controller, Get, Param } from 'routing-controllers';
import { ILocationsModuleApi } from './interface';
import {
  AsOcpiFunctionalEndpoint,
  BaseController,
  LocationsService,
  ModuleId,
  PaginatedLocationResponse,
  generateMockOcpiPaginatedResponse,
  ResponseSchema,
  generateMockOcpiResponse,
  LocationResponse,
  PaginatedParams,
  Paginated,
  ConnectorResponse,
  EvseResponse
} from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { HttpStatus } from '@citrineos/base';

const MOCK_PAGINATED_LOCATION = generateMockOcpiPaginatedResponse(
  PaginatedLocationResponse,
  new PaginatedParams(),
);
const MOCK_LOCATION = generateMockOcpiResponse(LocationResponse);
const MOCK_EVSE = generateMockOcpiResponse(EvseResponse);
const MOCK_CONNECTOR = generateMockOcpiResponse(ConnectorResponse);

/**
 * Server API for the provisioning component.
 */
@Controller(`/${ModuleId.Locations}`)
@Service()
export class LocationsModuleApi extends BaseController implements ILocationsModuleApi {
  /**
   * Constructs a new instance of the class.
   *
   * @param {LocationsService} locationsService - The Locations service.
   */
  constructor(
    readonly locationsService: LocationsService
  ) {
      super();
    }

  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(PaginatedLocationResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_PAGINATED_LOCATION
    }
  })
  async getLocations(
    @Paginated() paginatedParams?: PaginatedParams,
  ): Promise<PaginatedLocationResponse> {
    return this.locationsService.getLocations(paginatedParams);
  }

  @Get('/:locationId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(LocationResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_LOCATION
    }
  })
  async getLocationById(
    @Param('locationId') locationId: string
  ): Promise<LocationResponse> {
    return this.locationsService.getLocationById(locationId);
  }

  @Get('/:locationId/:evseId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(EvseResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_EVSE
    }
  })
  async getEvseById(
    @Param('locationId') locationId: string,
    @Param('evseId') evseId: string
  ): Promise<EvseResponse> {
    return this.locationsService.getEvseById(locationId, evseId);
  }

  @Get('/:locationId/:evseId/:connectorId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(ConnectorResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_CONNECTOR
    }
  })
  async getConnectorById(
    @Param('locationId') locationId: string,
    @Param('evseId') evseId: string,
    @Param('connectorId') connectorId: string,
  ): Promise<ConnectorResponse> {
    return this.locationsService.getConnectorById(locationId, evseId, connectorId);
  }

}
