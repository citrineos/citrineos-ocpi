// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ILogObj, Logger } from 'tslog';
import { Service } from 'typedi';
import { LocationResponse, PaginatedLocationResponse } from '../model/DTO/LocationDTO';
import { EvseResponse } from '../model/DTO/EvseDTO';
import { ConnectorResponse } from '../model/DTO/ConnectorDTO';
import { PaginatedParams } from '../controllers/param/PaginatedParams';
import { buildOcpiPaginatedResponse, DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { buildOcpiResponse, OcpiResponseStatusCode } from '../model/OcpiResponse';
import { buildOcpiErrorResponse } from '../model/OcpiErrorResponse';
import { OcpiHeaders } from '../model/OcpiHeaders';
import { NotFoundException } from '../exception/NotFoundException';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import {
  GET_CONNECTOR_BY_ID_QUERY,
  GET_EVSE_BY_ID_QUERY,
  GET_LOCATION_BY_ID_QUERY,
  GET_LOCATIONS_QUERY,
} from '../graphql/queries/location.queries';
import type {
  GetLocationsQuery,
  GetLocationByIdQuery,
  GetEvseByIdQuery,
  GetConnectorByIdQuery,
} from '../graphql/types/graphql';

@Service()
export class LocationsService {
  constructor(
    private logger: Logger<ILogObj>,
    private ocpiGraphqlClient: OcpiGraphqlClient,
  ) {}

  /**
   * Sender Methods
   */

  async getLocations(
    ocpiHeaders: OcpiHeaders,
    paginatedParams?: PaginatedParams,
  ): Promise<PaginatedLocationResponse> {
    this.logger.debug(
      `Getting all locations with headers ${JSON.stringify(ocpiHeaders)} and parameters ${JSON.stringify(paginatedParams)}`,
    );

    const dateFrom = paginatedParams?.dateFrom;
    const dateTo = paginatedParams?.dateTo;
    const limit = paginatedParams?.limit ?? DEFAULT_LIMIT;
    const offset = paginatedParams?.offset ?? DEFAULT_OFFSET;

    const variables = {
      limit,
      offset,
      countryCode: ocpiHeaders.toCountryCode,
      partyId: ocpiHeaders.toPartyId,
      dateFrom: dateFrom ? dateFrom.toISOString() : undefined,
      dateTo: dateTo ? dateTo.toISOString() : undefined,
    };

    const response = await this.ocpiGraphqlClient.request<GetLocationsQuery>(GET_LOCATIONS_QUERY, variables);

    // Map GraphQL DTOs to OCPI DTOs (assuming a mapper exists)
    const locations = response.Locations?.map((item) => {
      // TODO: Implement the mapping logic from GraphQL DTO to OCPI DTO
      return (global as any).LocationMapper.fromGraphql(item);
    }) ?? [];
    const locationsTotal = locations.length;

    return buildOcpiPaginatedResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      locationsTotal,
      limit,
      offset,
      locations,
    ) as PaginatedLocationResponse;
  }

  async getLocationById(locationId: number): Promise<LocationResponse> {
    this.logger.debug(`Getting location ${locationId}`);

    try {
      const variables = { id: locationId };
      const response = await this.ocpiGraphqlClient.request<GetLocationByIdQuery>(GET_LOCATION_BY_ID_QUERY, variables);
      // response.Locations is an array, so pick the first
      const location = (global as any).LocationMapper.fromGraphql(response.Locations?.[0]);
      return buildOcpiResponse(
        OcpiResponseStatusCode.GenericSuccessCode,
        location,
      ) as LocationResponse;
    } catch (e) {
      const statusCode =
        e instanceof NotFoundException
          ? OcpiResponseStatusCode.ClientUnknownLocation
          : OcpiResponseStatusCode.ClientGenericError;
      return buildOcpiErrorResponse(
        statusCode,
        (e as Error).message,
      ) as LocationResponse;
    }
  }

  async getEvseById(
    locationId: number,
    stationId: string,
    evseId: number,
  ): Promise<EvseResponse> {
    this.logger.debug(
      `Getting EVSE ${evseId} from Charging Station ${stationId} in Location ${locationId}`,
    );

    try {
      const variables = { locationId, stationId, evseId };
      const response = await this.ocpiGraphqlClient.request<GetEvseByIdQuery>(GET_EVSE_BY_ID_QUERY, variables);
      // Traverse to the EVSE object
      const evse = (global as any).EvseMapper.fromGraphql(
        response.Locations?.[0]?.ChargingStations?.[0]?.Evses?.[0]?.Evse
      );
      return buildOcpiResponse(OcpiResponseStatusCode.GenericSuccessCode, evse);
    } catch (e) {
      const statusCode =
        e instanceof NotFoundException
          ? OcpiResponseStatusCode.ClientUnknownLocation
          : OcpiResponseStatusCode.ClientGenericError;
      return buildOcpiErrorResponse(
        statusCode,
        (e as Error).message,
      ) as EvseResponse;
    }
  }

  async getConnectorById(
    locationId: number,
    stationId: string,
    evseId: number,
    connectorId: number,
  ): Promise<ConnectorResponse> {
    this.logger.debug(
      `Getting Connector ${connectorId} from EVSE ${evseId} in Charging Station ${stationId} in Location ${locationId}`,
    );

    try {
      const variables = { locationId, stationId, evseId, connectorId };
      const response = await this.ocpiGraphqlClient.request<GetConnectorByIdQuery>(GET_CONNECTOR_BY_ID_QUERY, variables);
      // Traverse to the Connector object
      const connector = (global as any).ConnectorMapper.fromGraphql(
        response.Locations?.[0]?.ChargingStations?.[0]?.Evses?.[0]?.Evse?.Connectors?.[0]
      );
      return buildOcpiResponse(
        OcpiResponseStatusCode.GenericSuccessCode,
        connector,
      );
    } catch (e) {
      const statusCode =
        e instanceof NotFoundException
          ? OcpiResponseStatusCode.ClientUnknownLocation
          : OcpiResponseStatusCode.ClientGenericError;
      return buildOcpiErrorResponse(
        statusCode,
        (e as Error).message,
      ) as ConnectorResponse;
    }
  }
}
