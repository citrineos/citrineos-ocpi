// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {Get, JsonController, Param} from 'routing-controllers';
import {ILocationsModuleApi} from './interface';
import {
  AsOcpiFunctionalEndpoint,
  BaseController,
  ConnectorResponse,
  EvseResponse,
  EXTRACT_EVSE_ID,
  EXTRACT_STATION_ID,
  generateMockOcpiPaginatedResponse,
  generateMockOcpiResponse,
  LocationResponse,
  LocationsService,
  ModuleId,
  Paginated,
  PaginatedLocationResponse,
  PaginatedParams,
  ResponseSchema,
} from '@citrineos/ocpi-base';
import {Service} from 'typedi';
import {HttpStatus} from '@citrineos/base';

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
@JsonController(`/${ModuleId.Locations}`)
@Service()
export class LocationsModuleApi
  extends BaseController
  implements ILocationsModuleApi {
  /**
   * Constructs a new instance of the class.
   *
   * @param {LocationsService} locationsService - The Locations service.
   */
  constructor(readonly locationsService: LocationsService) {
    super();
  }

  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(PaginatedLocationResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_PAGINATED_LOCATION,
    },
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
      success: MOCK_LOCATION,
    },
  })
  async getLocationById(
    @Param('location_id') locationId: number,
  ): Promise<LocationResponse> {
    return this.locationsService.getLocationById(locationId);
  }

  @Get('/:location_id/:evse_uid')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(EvseResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_EVSE,
    },
  })
  async getEvseById(
    @Param('location_id') locationId: number,
    @Param('evse_uid') evseUid: string,
  ): Promise<EvseResponse> {
    const stationId = EXTRACT_STATION_ID(evseUid);
    const evseId = EXTRACT_EVSE_ID(evseUid);

    return this.locationsService.getEvseById(
      locationId,
      stationId,
      Number(evseId),
    );
  }

  @Get('/:location_id/:evse_uid/:connector_id')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(ConnectorResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_CONNECTOR,
    },
  })
  async getConnectorById(
    @Param('location_id') locationId: number,
    @Param('evse_uid') evseUid: string,
    @Param('connector_id') connectorId: string,
  ): Promise<ConnectorResponse> {
    const stationId = EXTRACT_STATION_ID(evseUid);
    const evseId = EXTRACT_EVSE_ID(evseUid);

    return this.locationsService.getConnectorById(
      locationId,
      stationId,
      Number(evseId),
      Number(connectorId),
    );
  }
}
