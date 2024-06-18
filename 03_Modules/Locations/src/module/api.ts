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

  @Get('/:location_id')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(LocationResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_LOCATION
    }
  })
  async getLocationById(
    @Param('location_id') locationId: string
  ): Promise<LocationResponse> {
    return this.locationsService.getLocationById(locationId);
  }

  @Get('/:location_id/:evse_uid')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(EvseResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_EVSE
    }
  })
  async getEvseById(
    @Param('location_id') locationId: string,
    @Param('evse_uid') evseUid: string
  ): Promise<EvseResponse> {
    return this.locationsService.getEvseById(locationId, evseUid);
  }

  @Get('/:location_id/:evse_uid/:connector_id')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(ConnectorResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_CONNECTOR
    }
  })
  async getConnectorById(
    @Param('location_id') locationId: string,
    @Param('evse_uid') evseUid: string,
    @Param('connector_id') connectorId: string,
  ): Promise<ConnectorResponse> {
    return this.locationsService.getConnectorById(locationId, evseUid, connectorId);
  }

}
