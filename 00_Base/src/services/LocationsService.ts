// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import { Service } from 'typedi';
import { LocationsClientApi } from '../trigger/LocationsClientApi.js';
import { buildPaginatedParams } from '../trigger/param/PaginatedParams.js';
import type {
  PullPartnerModulesBody,
  PullSummary,
} from '../model/DTO/PullPartnerModulesBody.js';

import type { TenantPartnerDto } from '@zetra/citrineos-base';
import type { LocationDTO } from '../model/DTO/LocationDTO.js';
import { LocationReceiverService } from './LocationReceiverService.js';
import type {
  LocationResponse,
  PaginatedLocationResponse,
} from '../model/DTO/LocationDTO.js';
import type { EvseResponse } from '../model/DTO/EvseDTO.js';
import type { ConnectorResponse } from '../model/DTO/ConnectorDTO.js';
import { PaginatedParams } from '../controllers/param/PaginatedParams.js';
import {
  buildOcpiPaginatedResponse,
  DEFAULT_LIMIT,
  DEFAULT_OFFSET,
} from '../model/PaginatedResponse.js';
import {
  buildOcpiResponse,
  OcpiResponseStatusCode,
} from '../model/OcpiResponse.js';
import { buildOcpiErrorResponse } from '../model/OcpiErrorResponse.js';
import { OcpiHeaders } from '../model/OcpiHeaders.js';
import { NotFoundException } from '../exception/NotFoundException.js';
import type {
  GetLocationByOcpiIdQueryResult,
  GetLocationByOcpiIdQueryVariables,
  GetConnectorByIdQueryResult,
  GetConnectorByIdQueryVariables,
  GetEvseByIdQueryResult,
  GetEvseByIdQueryVariables,
  GetLocationsQueryResult,
  GetLocationsQueryVariables,
  Locations_Bool_Exp,
  GetTenantPartnerByCpoClientAndModuleIdQueryVariables,
  GetTenantPartnerByCpoClientAndModuleIdQueryResult,
} from '../graphql/index.js';
import {
  GET_CONNECTOR_BY_ID_QUERY,
  GET_EVSE_BY_ID_QUERY,
  GET_LOCATION_BY_OCPID_ID_QUERY,
  GET_LOCATIONS_QUERY,
  GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT,
  OcpiGraphqlClient,
} from '../graphql/index.js';
import {
  ConnectorMapper,
  EvseMapper,
  LocationMapper,
} from '../mapper/index.js';
import type {
  ChargingStationDto,
  ConnectorDto,
  Endpoint,
  EvseDto,
  LocationDto,
} from '@zetra/citrineos-base';
import { HttpMethod } from '@zetra/citrineos-base';
import { z } from 'zod';

@Service()
export class LocationsService {
  constructor(
    private logger: Logger<ILogObj>,
    private ocpiGraphqlClient: OcpiGraphqlClient,
    private locationsClientApi: LocationsClientApi,
    private locationReceiverService: LocationReceiverService,
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
    const limit = paginatedParams?.limit ?? DEFAULT_LIMIT;
    const offset = paginatedParams?.offset ?? DEFAULT_OFFSET;
    const where: Locations_Bool_Exp = {
      Tenant: {
        countryCode: { _eq: ocpiHeaders.toCountryCode },
        partyId: { _eq: ocpiHeaders.toPartyId },
      },
    };
    const dateFilters: any = {};
    if (paginatedParams?.dateFrom)
      dateFilters._gte = paginatedParams.dateFrom.toISOString();
    if (paginatedParams?.dateTo)
      dateFilters._lte = paginatedParams?.dateTo.toISOString();
    if (Object.keys(dateFilters).length > 0) {
      where.updatedAt = dateFilters;
    }
    const variables = {
      limit,
      offset,
      where,
    };

    const response = await this.ocpiGraphqlClient.request<
      GetLocationsQueryResult,
      GetLocationsQueryVariables
    >(GET_LOCATIONS_QUERY, variables);

    // Map GraphQL DTOs to OCPI DTOs
    const locations =
      response.Locations.map((value) =>
        LocationMapper.fromGraphql(value as LocationDto),
      ) ?? [];
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
      const variables = { id: locationId.toString() };
      const response = await this.ocpiGraphqlClient.request<
        GetLocationByOcpiIdQueryResult,
        GetLocationByOcpiIdQueryVariables
      >(GET_LOCATION_BY_OCPID_ID_QUERY, variables);
      // response.Locations is an array, so pick the first
      if (response.Locations && response.Locations.length > 1) {
        this.logger.warn(
          `Multiple locations found for id ${locationId}. Returning the first one. All entries: ${JSON.stringify(response.Locations)}`,
        );
      }
      const location = LocationMapper.fromGraphql(
        response.Locations[0] as unknown as LocationDto,
      );
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
      const variables = {
        locationId: locationId,
        stationId,
        evseId,
      };
      const response = await this.ocpiGraphqlClient.request<
        GetEvseByIdQueryResult,
        GetEvseByIdQueryVariables
      >(GET_EVSE_BY_ID_QUERY, variables);
      const evse = EvseMapper.fromGraphql(
        response.Locations[0].chargingPool[0] as ChargingStationDto,
        response.Locations[0].chargingPool[0].evses[0] as EvseDto,
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
      const variables = {
        locationId: locationId,
        stationId,
        evseId,
        connectorId,
      };
      const response = await this.ocpiGraphqlClient.request<
        GetConnectorByIdQueryResult,
        GetConnectorByIdQueryVariables
      >(GET_CONNECTOR_BY_ID_QUERY, variables);
      // Traverse to the Connector object
      if (
        response.Locations?.[0]?.chargingPool?.[0]?.evses?.[0]?.connectors &&
        response.Locations[0].chargingPool[0].evses[0].connectors.length > 1
      ) {
        this.logger.warn(
          `Multiple connectors found for location id ${locationId}, station id ${stationId}, EVSE id ${evseId}, and connector id ${connectorId}. Returning the first one. All entries: ${JSON.stringify(response.Locations[0].chargingPool[0].evses[0].connectors)}`,
        );
      }
      const connector = ConnectorMapper.fromGraphql(
        response.Locations?.[0]?.chargingPool?.[0]?.evses?.[0]
          ?.connectors?.[0] as unknown as ConnectorDto,
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

  async PullPartnerLocations(
    body: PullPartnerModulesBody,
  ): Promise<PullSummary> {
    const {
      ourCountryCode,
      ourPartyId,
      cpoCountryCode,
      cpoPartyId,
      offset,
      limit,
      date_from,
      date_to,
    } = body;

    this.logger.info(
      'PullPartnerLocations',
      ourCountryCode,
      ourPartyId,
      cpoCountryCode,
      cpoPartyId,
    );

    const tenantPartner = await this.ocpiGraphqlClient.request<
      GetTenantPartnerByCpoClientAndModuleIdQueryResult,
      GetTenantPartnerByCpoClientAndModuleIdQueryVariables
    >(GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT, {
      cpoCountryCode: ourCountryCode,
      cpoPartyId: ourPartyId,
      clientCountryCode: cpoCountryCode,
      clientPartyId: cpoPartyId,
    });

    const partnerRow = tenantPartner.TenantPartners[0];
    if (!partnerRow?.partnerProfileOCPI) {
      throw new Error('Tenant partner missing partnerProfileOCPI');
    }
    const partner = partnerRow as TenantPartnerDto;

    const endpoints = tenantPartner.TenantPartners[0].partnerProfileOCPI!
      .endpoints as Endpoint[];
    const url = endpoints.find(
      (e: Endpoint) => e.identifier === 'locations_SENDER',
    )?.url;

    if (!url) {
      throw new Error('No locations URL found');
    }

    const paginated = buildPaginatedParams(
      offset,
      limit,
      date_from != null ? new Date(date_from) : undefined,
      date_to != null ? new Date(date_to) : undefined,
    );

    let currentOffset = offset;
    let hasMore = true;
    let processedLocations = 0;
    let upsertSucceededLocations = 0;
    let upsertFailedLocations = 0;
    let skippedInvalidLocations = 0;

    while (hasMore) {
      const resp = await this.locationsClientApi.request(
        ourCountryCode,
        ourPartyId,
        cpoCountryCode,
        cpoPartyId,
        HttpMethod.Get,
        z.any(),
        tenantPartner.TenantPartners[0].partnerProfileOCPI!,
        true,
        url,
        undefined,
        { ...paginated, offset: currentOffset },
        undefined,
        undefined,
        partnerRow.awsSecretCertificateArn,
      );

      for (const item of (resp as any).data) {
        processedLocations++;
        if (item == null || typeof item !== 'object' || !('id' in item)) {
          skippedInvalidLocations++;
          continue;
        }
        const location = item as LocationDTO;
        try {
          await this.locationReceiverService.upsertLocationForPartner(
            location,
            String(location.id),
            partner,
          );
          upsertSucceededLocations++;
          this.logger.info(
            `PullPartnerLocations: upserted location ${String(location.id)}`,
          );
        } catch (err) {
          upsertFailedLocations++;
          this.logger.error(
            `PullPartnerLocations: failed for location ${String(location.id)}`,
            err,
          );
        }
      }

      const nextOffset: number | undefined = (resp as any).offset;
      if (nextOffset != null) {
        currentOffset = nextOffset;
      } else {
        hasMore = false;
      }
    }

    return {
      module: 'locations',
      processed: processedLocations,
      upsertSucceeded: upsertSucceededLocations,
      upsertFailed: upsertFailedLocations,
      skippedInvalid: skippedInvalidLocations,
    };
  }
}
