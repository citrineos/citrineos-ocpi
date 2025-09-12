// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Get, JsonController, Param } from 'routing-controllers';
import { ILocationsModuleApi } from './ILocationsModuleApi';
import {
  AsOcpiFunctionalEndpoint,
  BaseController,
  ConnectorResponse,
  ConnectorResponseSchema,
  ConnectorResponseSchemaName,
  EvseResponse,
  EvseResponseSchema,
  EvseResponseSchemaName,
  EXTRACT_EVSE_ID,
  EXTRACT_STATION_ID,
  FunctionalEndpointParams,
  generateMockForSchema,
  generateMockOcpiPaginatedResponse,
  LocationResponse,
  LocationResponseSchema,
  LocationResponseSchemaName,
  LocationsService,
  ModuleId,
  OcpiHeaders,
  Paginated,
  PaginatedLocationResponse,
  PaginatedLocationResponseSchema,
  PaginatedLocationResponseSchemaName,
  PaginatedParams,
  ResponseSchema,
  versionIdParam,
  VersionNumber,
  VersionNumberParam,
} from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { HttpStatus } from '@citrineos/base';

const MOCK_PAGINATED_LOCATION = generateMockOcpiPaginatedResponse(
  PaginatedLocationResponseSchema,
  PaginatedLocationResponseSchemaName,
  new PaginatedParams(),
);
const MOCK_LOCATION = generateMockForSchema(
  LocationResponseSchema,
  LocationResponseSchemaName,
);
const MOCK_EVSE = generateMockForSchema(
  EvseResponseSchema,
  EvseResponseSchemaName,
);
const MOCK_CONNECTOR = generateMockForSchema(
  ConnectorResponseSchema,
  ConnectorResponseSchemaName,
);

/**
 * Server API for the provisioning component.
 */
@JsonController(`/:${versionIdParam}/${ModuleId.Locations}`)
@Service()
export class LocationsModuleApi
  extends BaseController
  implements ILocationsModuleApi
{
  /**
   * Constructs a new instance of the class.
   *
   * @param {LocationsService} locationsService - The Locations service.
   * @param {AdminLocationsService} adminLocationsService - The Admin Locations service.
   */
  constructor(
    readonly locationsService: LocationsService,
    // readonly adminLocationsService: AdminLocationsService,
  ) {
    super();
  }

  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(
    PaginatedLocationResponseSchema,
    PaginatedLocationResponseSchemaName,
    {
      statusCode: HttpStatus.OK,
      description: 'Successful response',
      examples: {
        success: MOCK_PAGINATED_LOCATION,
      },
    },
  )
  async getLocations(
    @VersionNumberParam() version: VersionNumber,
    @FunctionalEndpointParams() ocpiHeaders: OcpiHeaders,
    @Paginated() paginatedParams?: PaginatedParams,
  ): Promise<PaginatedLocationResponse> {
    return this.locationsService.getLocations(ocpiHeaders, paginatedParams);
  }

  @Get('/:location_id')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(LocationResponseSchema, LocationResponseSchemaName, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_LOCATION,
    },
  })
  async getLocationById(
    @VersionNumberParam() version: VersionNumber,
    @Param('location_id') locationId: number,
  ): Promise<LocationResponse> {
    return this.locationsService.getLocationById(locationId);
  }

  @Get('/:location_id/:evse_uid')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(EvseResponseSchema, EvseResponseSchemaName, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_EVSE,
    },
  })
  async getEvseById(
    @VersionNumberParam() version: VersionNumber,
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
  @ResponseSchema(ConnectorResponseSchema, ConnectorResponseSchemaName, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_CONNECTOR,
    },
  })
  async getConnectorById(
    @VersionNumberParam() version: VersionNumber,
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

  /**
   * Admin Endpoints
   **/

  // @Put('/admin')
  // @AsAdminEndpoint()
  // @ResponseSchema(OcpiEmptyResponse, {
  //   statusCode: HttpStatus.OK,
  //   description: 'Successful response',
  // })
  // async createLocation(
  //   @QueryParam('broadcast') broadcast: boolean,
  //   @Body() adminLocation: AdminLocationDTO,
  // ): Promise<LocationDTO> {
  //   return await this.adminLocationsService.createOrUpdateLocation(
  //     adminLocation,
  //     broadcast,
  //   );
  // }
}
