// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import { UnauthorizedException } from '@zetra/citrineos-base';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import { Service } from 'typedi';

import type { LocationResponse } from '../model/DTO/LocationDTO.js';
import type { ConnectorDTO } from '../model/DTO/ConnectorDTO.js';
import {
  buildOcpiResponse,
  OcpiResponseStatusCode,
} from '../model/OcpiResponse.js';
import { buildOcpiErrorResponse } from '../model/OcpiErrorResponse.js';
import { NotFoundException } from '../exception/NotFoundException.js';
import type {
  InsertChargingStationMutationResult,
  InsertChargingStationMutationVariables,
  UpsertLocationMutationResult,
  UpsertLocationMutationVariables,
  UpsertEvseMutationResult,
  UpsertEvseMutationVariables,
  GetLocationByOcpiIdAndPartnerIdQueryResult,
  GetLocationByOcpiIdAndPartnerIdQueryVariables,
  UpsertConnectorMutationVariables,
  GetEvseByLocationAndOwnerPartnerQueryResult,
  GetEvseByLocationAndOwnerPartnerQueryVariables,
  UpdateLocationPatchMutationVariables,
  UpdateLocationPatchMutationResult,
  GetEvseByOcpiIdAndPartnerIdQueryResult,
  GetEvseByOcpiIdAndPartnerIdQueryVariables,
  UpdateEvsePatchMutationResult,
  UpdateEvsePatchMutationVariables,
  GetPartnerLocationByOcpiIdQueryResult,
  GetPartnerLocationByOcpiIdQueryVariables,
  GetPartnerConnectorByOcpiIdAndEvseIdQueryResult,
  GetPartnerConnectorByOcpiIdAndEvseIdQueryVariables,
  UpdateConnectorPatchMutationVariables,
  UpdateConnectorPatchMutationResult,
  GetPartnerEvseByOcpiIdsQueryVariables,
  GetPartnerEvseByOcpiIdsQueryResult,
  GetConnectorByOcpiIdAndEvseIdQueryVariables,
  GetConnectorByOcpiIdAndEvseIdQueryResult,
  GetChargingStationByLocationAndOwnerPartnerQueryResult,
  GetChargingStationByLocationAndOwnerPartnerQueryVariables,
  UpsertConnectorMutationResult,
  GetTariffByPartnerQueryResult,
  GetTariffByPartnerQueryVariables,
  UpsertConnectorTariffOcpiPartnerMutationVariables,
  UpsertConnectorTariffOcpiPartnerMutationResult,
} from '../graphql/index.js';
import {
  OcpiGraphqlClient,
  GET_LOCATION_BY_OCPI_ID_AND_PARTNER_ID_QUERY,
  GET_EVSE_BY_LOCATION_ID_AND_OWNER_PARTNER_ID,
  UPSERT_EVSE_MUTATION,
  UPSERT_CONNECTOR_MUTATION,
  INSERT_CHARGING_STATION_MUTATION,
  UPSERT_LOCATION_MUTATION,
  GET_CHARGING_STATION_BY_LOCATION_ID_AND_OWNER_PARTNER_ID,
  GET_PARTNER_LOCATION_BY_OCPI_ID,
  UPDATE_LOCATION_PATCH_MUTATION,
  UPDATE_EVSE_PATCH_MUTATION,
  GET_PARTNER_EVSE_BY_OCPI_ID,
  GET_PARTNER_CONNECTOR_BY_OCPI_ID_AND_EVSE_ID,
  GET_CONNECTOR_BY_OCPI_ID_AND_EVSE_ID,
  UPDATE_CONNECTOR_PATCH_MUTATION,
  GET_EVSE_BY_OCPI_ID_AND_PARTNER_ID_QUERY,
  UPSERT_CONNECTOR_TARIFF_OCPIPARTNER_MUTATION,
  GET_TARIFF_BY_PARTNER_QUERY,
  DELETE_OCPI_CONNECTOR_TARIFF_MUTATION,
} from '../graphql/index.js';
import {
  ConnectorMapper,
  EvseMapper,
  LocationMapper,
} from '../mapper/index.js';
import type { TenantPartnerDto } from '@zetra/citrineos-base';

import type { LocationDTO, LocationEvseDTO } from '../model/DTO/LocationDTO.js';
import type { EvseResponse } from '../model/DTO/EvseDTO.js';
import type { ConnectorResponse } from '../model/DTO/ConnectorDTO.js';

function ocpiCiEquals(a: string, b: string): boolean {
  return a.trim().toUpperCase() === b.trim().toUpperCase();
}

/** OCPI: URL segments must match the authenticated CPO partner when present. */
function validateUrlMatchesTenantPartner(
  countryCode: string,
  partyId: string,
  tenantPartner: TenantPartnerDto,
): LocationResponse | undefined {
  const cc = tenantPartner.countryCode;
  const pid = tenantPartner.partyId;
  if (cc == null || pid == null) return undefined;
  if (!ocpiCiEquals(cc, countryCode) || !ocpiCiEquals(pid, partyId)) {
    return buildOcpiErrorResponse(
      OcpiResponseStatusCode.ClientInvalidOrMissingParameters,
      'country_code and party_id in URL must match the authenticated partner',
    ) as LocationResponse;
  }
  return undefined;
}

function validateLocationBodyMatchesUrl(
  countryCode: string,
  partyId: string,
  location: LocationDTO,
): LocationResponse | undefined {
  if (
    !ocpiCiEquals(location.country_code, countryCode) ||
    !ocpiCiEquals(location.party_id, partyId)
  ) {
    return buildOcpiErrorResponse(
      OcpiResponseStatusCode.ClientInvalidOrMissingParameters,
      'country_code and party_id in URL must match the Location object',
    ) as LocationResponse;
  }
  return undefined;
}

function validateLocationTenantPartnerMatchesUrl(
  tenant: { countryCode?: string | null; partyId?: string | null } | undefined,
  countryCode: string,
  partyId: string,
): LocationResponse | undefined {
  if (!tenant?.countryCode || !tenant?.partyId) return undefined;
  if (
    !ocpiCiEquals(tenant.countryCode, countryCode) ||
    !ocpiCiEquals(tenant.partyId, partyId)
  ) {
    return buildOcpiErrorResponse(
      OcpiResponseStatusCode.ClientInvalidOrMissingParameters,
      'country_code and party_id in URL must match the Location tenant',
    ) as LocationResponse;
  }
  return undefined;
}

function hashToInt(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h | 0;
}

@Service()
export class LocationReceiverService {
  constructor(
    private logger: Logger<ILogObj>,
    private ocpiGraphqlClient: OcpiGraphqlClient,
  ) {}

  async getLocationByCountryPartyAndId(
    countryCode: string,
    partyId: string,
    locationId: string,
    tenantPartner: TenantPartnerDto,
  ): Promise<LocationResponse> {
    this.logger.debug(
      `Getting location ${locationId} by country ${countryCode} and party ${partyId}`,
    );
    try {
      if (!tenantPartner.id) {
        throw new UnauthorizedException(
          'Credentials not found for given token',
        );
      }
      const partnerErr = validateUrlMatchesTenantPartner(
        countryCode,
        partyId,
        tenantPartner,
      );
      if (partnerErr) return partnerErr;
      const variables = {
        id: locationId,
        partnerId: tenantPartner.id,
      };
      const response = await this.ocpiGraphqlClient.request<
        GetLocationByOcpiIdAndPartnerIdQueryResult,
        GetLocationByOcpiIdAndPartnerIdQueryVariables
      >(GET_LOCATION_BY_OCPI_ID_AND_PARTNER_ID_QUERY, variables);
      const location = LocationMapper.fromGraphqlReceiver(
        response.Locations[0],
        tenantPartner,
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

  async getEvseByCountryPartyAndId(
    countryCode: string,
    partyId: string,
    locationId: string,
    evseUid: string,
    tenantPartner: TenantPartnerDto,
  ): Promise<EvseResponse> {
    this.logger.debug(
      `Getting location ${locationId} by country ${countryCode} and party ${partyId}`,
    );
    try {
      if (!tenantPartner.id) {
        throw new UnauthorizedException(
          'Credentials not found for given token',
        );
      }
      const partnerErr = validateUrlMatchesTenantPartner(
        countryCode,
        partyId,
        tenantPartner,
      );
      if (partnerErr) return partnerErr as EvseResponse;
      const variables = {
        locationId: locationId,
        partnerId: tenantPartner.id,
        evseUid: evseUid,
      };
      const response = await this.ocpiGraphqlClient.request<
        GetEvseByOcpiIdAndPartnerIdQueryResult,
        GetEvseByOcpiIdAndPartnerIdQueryVariables
      >(GET_EVSE_BY_OCPI_ID_AND_PARTNER_ID_QUERY, variables);
      if (!response.Evses[0]) {
        throw new NotFoundException(
          `Evse ${evseUid} not found for location ${locationId}`,
        );
      }
      const evse = EvseMapper.fromGraphqlReceiver(response.Evses[0]);
      return buildOcpiResponse(
        OcpiResponseStatusCode.GenericSuccessCode,
        evse,
      ) as EvseResponse;
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

  async getConnectorByCountryPartyAndId(
    countryCode: string,
    partyId: string,
    locationId: string,
    evseUid: string,
    connectorId: string,
    tenantPartner: TenantPartnerDto,
  ): Promise<ConnectorResponse> {
    this.logger.debug(
      `Getting location ${locationId} ${evseUid} ${connectorId} by country ${countryCode} and party ${partyId}`,
    );
    try {
      if (!tenantPartner.id) {
        throw new UnauthorizedException(
          'Credentials not found for given token',
        );
      }
      const partnerErr = validateUrlMatchesTenantPartner(
        countryCode,
        partyId,
        tenantPartner,
      );
      if (partnerErr) return partnerErr as ConnectorResponse;
      const variables = {
        locationId: locationId,
        partnerId: tenantPartner.id,
        evseUid: evseUid,
        connectorId: connectorId,
      };
      const response = await this.ocpiGraphqlClient.request<
        GetConnectorByOcpiIdAndEvseIdQueryResult,
        GetConnectorByOcpiIdAndEvseIdQueryVariables
      >(GET_CONNECTOR_BY_OCPI_ID_AND_EVSE_ID, variables);
      const connector = ConnectorMapper.fromGraphqlReceiver(
        response.Connectors[0],
      );
      return buildOcpiResponse(
        OcpiResponseStatusCode.GenericSuccessCode,
        connector,
      ) as ConnectorResponse;
    } catch (e) {
      this.logger.error(e);
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

  async upsertLocationForPartner(
    location: LocationDTO,
    locationId: string,
    tenantPartner: TenantPartnerDto,
  ): Promise<void> {
    const coordinates = {
      type: 'Point',
      coordinates: [
        Number(location?.coordinates?.longitude),
        Number(location?.coordinates?.latitude),
      ],
    };
    const response = await this.ocpiGraphqlClient.request<
      UpsertLocationMutationResult,
      UpsertLocationMutationVariables
    >(UPSERT_LOCATION_MUTATION, {
      object: {
        ocpiId: locationId,
        ownerTenantPartnerId: tenantPartner.id,
        tenantId: tenantPartner.tenantId,
        coordinates: coordinates,
        name: location.name,
        address: location.address,
        city: location.city,
        country: location.country,
        postalCode: location.postal_code,
        state: location.state ?? null,
        parkingType: location.parking_type ?? null,
        timeZone: location.time_zone ?? null,
        operator: location.operator ?? null,
        suboperator: location.suboperator ?? null,
        owner: location.owner ?? null,
        chargingWhenClosed: location.charging_when_closed ?? null,
        relatedLocations: location.related_locations ?? null,
        publishUpstream: location.publish ?? false,
        publishAllowedTo: location.publish_allowed_to ?? null,
        energyMix: location.energy_mix ?? null,
        openingHours: location.opening_times ?? null,
        facilities: location.facilities ?? null,
        images: location.images ?? null,
        directions: location.directions ?? null,
        createdAt: new Date(),
        updatedAt: location.last_updated ?? new Date(),
      },
    });

    if (!response.insert_Locations_one?.id) {
      throw new Error('Failed to insert location');
    }

    if (!tenantPartner.id) {
      throw new UnauthorizedException('Credentials not found for given token');
    }

    const variables = {
      locationId: response.insert_Locations_one.id,
      partnerId: tenantPartner.id,
    };

    let idChargingStationAssociatedWithLocation = null;
    const stationIdFoundResponse = await this.ocpiGraphqlClient.request<
      GetChargingStationByLocationAndOwnerPartnerQueryResult,
      GetChargingStationByLocationAndOwnerPartnerQueryVariables
    >(GET_CHARGING_STATION_BY_LOCATION_ID_AND_OWNER_PARTNER_ID, variables);

    if (stationIdFoundResponse.ChargingStations.length === 0) {
      const responseCreateVirtualChargingStation =
        await this.createVirtualChargingStationForPartnerAndLocation(
          response.insert_Locations_one.id.toString(),
          tenantPartner,
        );
      idChargingStationAssociatedWithLocation =
        responseCreateVirtualChargingStation?.insert_ChargingStations_one?.id ??
        null;
    } else {
      idChargingStationAssociatedWithLocation =
        stationIdFoundResponse.ChargingStations[0].id;
    }

    if (!idChargingStationAssociatedWithLocation) {
      throw new Error('Failed to create virtual charging station');
    }

    for (const evse of location.evses ?? []) {
      await this.upsertEvseForPartner(
        tenantPartner,
        evse.uid,
        evse,
        idChargingStationAssociatedWithLocation,
      );
    }
  }

  async putLocationByCountryPartyAndId(
    countryCode: string,
    partyId: string,
    location: LocationDTO,
    locationId: string,
    tenantPartner: TenantPartnerDto,
  ): Promise<LocationResponse | undefined> {
    if (!tenantPartner.id) {
      throw new UnauthorizedException('Credentials not found for given token');
    }
    console.log('tenantPartner', tenantPartner);
    // const partnerErr = validateUrlMatchesTenantPartner(
    //   countryCode,
    //   partyId,
    //   tenantPartner,
    // );
    // if (partnerErr) return partnerErr;
    // const bodyErr = validateLocationBodyMatchesUrl(
    //   countryCode,
    //   partyId,
    //   location,
    // );
    // if (bodyErr) return bodyErr;

    await this.upsertLocationForPartner(location, locationId, tenantPartner);

    return undefined;
  }

  async createVirtualChargingStationForPartnerAndLocation(
    locationId: string,
    tenantPartner: TenantPartnerDto,
  ): Promise<InsertChargingStationMutationResult> {
    const response = await this.ocpiGraphqlClient.request<
      InsertChargingStationMutationResult,
      InsertChargingStationMutationVariables
    >(INSERT_CHARGING_STATION_MUTATION, {
      object: {
        id: `${tenantPartner.id}-${locationId}-${Math.random().toString(36).substring(2, 15)}`,
        locationId: Number(locationId),
        tenantId: tenantPartner.tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    if (!response.insert_ChargingStations_one?.id) {
      throw new Error(
        `Failed to create virtual charging station for location ${locationId}`,
      );
    }
    return response;
  }

  async deleteOcpiConnectorTariff(
    connectorId: number,
    connectorOcpiId: string,
  ): Promise<any> {
    const response = await this.ocpiGraphqlClient.request<any, any>(
      DELETE_OCPI_CONNECTOR_TARIFF_MUTATION,
      {
        connectorId: connectorId,
        connectorOcpiId: connectorOcpiId,
      },
    );
    return response;
  }

  async upsertTariffForPartnerAndConnector(
    tenantPartner: TenantPartnerDto,
    tariff: any,
    connectorOcpiId: string,
    connectorId: number,
  ): Promise<any> {
    if (!tenantPartner.id) {
      throw new Error('Tenant partner not found');
    }
    const tariffResponse = await this.ocpiGraphqlClient.request<
      GetTariffByPartnerQueryResult,
      GetTariffByPartnerQueryVariables
    >(GET_TARIFF_BY_PARTNER_QUERY, {
      ocpiTariffId: tariff,
      tenantPartnerId: tenantPartner.id,
    });

    const tariffId = tariffResponse.Tariffs[0]?.id;
    if (!tariffId) {
      throw new Error('Tariff not found');
    }

    const response = await this.ocpiGraphqlClient.request<
      UpsertConnectorTariffOcpiPartnerMutationResult,
      UpsertConnectorTariffOcpiPartnerMutationVariables
    >(UPSERT_CONNECTOR_TARIFF_OCPIPARTNER_MUTATION, {
      object: {
        connectorOcpiId: connectorOcpiId,
        tariffOcpiId: tariff,
        tariffId: tariffId,
        tenantPartnerId: tenantPartner.id,
        tenantId: tenantPartner.tenantId,
        connectorId: connectorId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    if (!response.insert_ConnectorTariffs_one?.id) {
      throw new Error(
        `Failed to create or update connector tariff for connector ${connectorId} and tariff ${tariff}`,
      );
    }
    return response;
  }

  async upsertConnectorForPartnerAndEvse(
    tenantPartner: TenantPartnerDto,
    connector: any,
    evseId: string,
    evseOcpiUid: string,
    stationId: string,
  ): Promise<UpsertConnectorMutationResult> {
    if (!tenantPartner.id) {
      throw new UnauthorizedException('Credentials not found for given token');
    }
    const key = `${evseOcpiUid}:${connector.id}:${tenantPartner.id}`;
    const response = await this.ocpiGraphqlClient.request<
      UpsertConnectorMutationResult,
      UpsertConnectorMutationVariables
    >(UPSERT_CONNECTOR_MUTATION, {
      object: {
        ocpiId: connector.id,
        stationId,
        evseId: Number(evseId),
        connectorId: hashToInt(key),
        type: connector.standard,
        format: connector.format,
        powerType: connector.power_type ?? null,
        tenantId: tenantPartner.tenantId,
        maximumAmperage: connector.max_amperage ?? null,
        maximumVoltage: connector.max_voltage ?? null,
        maximumPowerWatts: connector.max_electric_power ?? null,
        termsAndConditionsUrl: connector.terms_and_conditions ?? null,
        timestamp: connector.last_updated ?? new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: connector.last_updated ?? new Date(),
      },
    });
    if (!response.insert_Connectors_one?.id) {
      throw new Error(`Failed to create or update connector ${connector.id}`);
    }

    const connectorOcpiId = response.insert_Connectors_one?.ocpiId;
    const connectorId = response.insert_Connectors_one?.id;

    if (!connectorOcpiId || !connectorId || !evseOcpiUid || !evseId) {
      throw new Error('Failed to get connector or evse');
    }

    // if there is other tariffs for this connector, delete them
    await this.deleteOcpiConnectorTariff(connectorId, connectorOcpiId);
    if (connector.tariff_ids?.length) {
      for (const tariff of connector.tariff_ids) {
        await this.upsertTariffForPartnerAndConnector(
          tenantPartner,
          tariff,
          connectorOcpiId,
          connectorId,
        );
      }
    }
    return response;
  }

  async upsertEvseForPartner(
    tenantPartner: TenantPartnerDto,
    evseUid: string,
    evse: LocationEvseDTO,
    stationId: string,
  ): Promise<void> {
    const response = await this.ocpiGraphqlClient.request<
      UpsertEvseMutationResult,
      UpsertEvseMutationVariables
    >(UPSERT_EVSE_MUTATION, {
      object: {
        ocpiUid: evse.uid,
        evseId: evse.evse_id ?? '',
        stationId: stationId,
        physicalReference: evse.physical_reference?.toString() ?? null,
        capabilities: evse.capabilities ?? null,
        floorLevel: evse.floor_level ?? null,
        ocpiStatus: evse.status ?? null,
        coordinates: evse.coordinates
          ? {
              type: 'Point',
              coordinates: [
                Number(evse.coordinates.longitude),
                Number(evse.coordinates.latitude),
              ],
            }
          : null,
        parkingRestrictions: evse.parking_restrictions ?? null,
        statusSchedule: evse.status_schedule ?? null,
        images: evse.images ?? null,
        directions: evse.directions ?? null,
        tenantId: tenantPartner.tenantId,
        createdAt: new Date(),
        updatedAt: evse.last_updated ?? new Date(),
      },
    });

    const insertedEvseId = response?.insert_Evses_one?.id;
    const insertedEvseOcpiUid = response?.insert_Evses_one?.ocpiUid;
    if (!insertedEvseId || !insertedEvseOcpiUid) {
      throw new Error('Failed to insert evse');
    }

    if (insertedEvseId != null && evse.connectors?.length) {
      for (const connector of evse.connectors) {
        await this.upsertConnectorForPartnerAndEvse(
          tenantPartner,
          connector,
          String(insertedEvseId),
          insertedEvseOcpiUid,
          stationId,
        );
      }
    }
  }

  async putEvseByCountryPartyAndId(
    countryCode: string,
    partyId: string,
    locationId: string,
    evseUid: string,
    evse: LocationEvseDTO,
    tenantPartner: TenantPartnerDto,
  ): Promise<LocationResponse | undefined> {
    this.logger.info(
      `Receiver PUT evse ${countryCode}/${partyId}/${locationId}/${evseUid} body=${JSON.stringify(evse)}`,
    );
    if (!tenantPartner.id) {
      throw new UnauthorizedException('Credentials not found for given token');
    }
    const partnerErr = validateUrlMatchesTenantPartner(
      countryCode,
      partyId,
      tenantPartner,
    );
    if (partnerErr) return partnerErr;

    const variables = { id: locationId, partnerId: tenantPartner.id };
    const response = await this.ocpiGraphqlClient.request<
      GetLocationByOcpiIdAndPartnerIdQueryResult,
      GetLocationByOcpiIdAndPartnerIdQueryVariables
    >(GET_LOCATION_BY_OCPI_ID_AND_PARTNER_ID_QUERY, variables);

    if (!response.Locations || response.Locations.length === 0) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        'Unknown location',
      ) as LocationResponse;
    }

    const locRow = response.Locations[0];
    const ownerTenantPartner = locRow?.ownerTenantPartner;
    const tenantErr = validateLocationTenantPartnerMatchesUrl(
      {
        countryCode: ownerTenantPartner?.countryCode,
        partyId: ownerTenantPartner?.partyId,
      },
      countryCode,
      partyId,
    );
    if (tenantErr) return tenantErr;

    const evseVariables = {
      partnerId: tenantPartner.id,
      locationId: locationId,
      evseId: evseUid,
    };
    const evseResponse = await this.ocpiGraphqlClient.request<
      GetEvseByLocationAndOwnerPartnerQueryResult,
      GetEvseByLocationAndOwnerPartnerQueryVariables
    >(GET_EVSE_BY_LOCATION_ID_AND_OWNER_PARTNER_ID, evseVariables);
    const location_id = evseResponse.Locations[0].id;

    const internalLocationIdStr = String(evseResponse.Locations[0].id);

    if (evseResponse.Locations[0].chargingPool.length === 0) {
      const created =
        await this.createVirtualChargingStationForPartnerAndLocation(
          internalLocationIdStr,
          tenantPartner,
        );
      const stationId = created?.insert_ChargingStations_one?.id;
      if (!stationId) {
        return buildOcpiErrorResponse(
          OcpiResponseStatusCode.ServerGenericError,
          'Failed to create charging station for location',
        ) as LocationResponse;
      }
      await this.upsertEvseForPartner(
        tenantPartner,
        evseUid,
        evse,
        String(stationId),
      );
    } else {
      await this.upsertEvseForPartner(
        tenantPartner,
        evseUid,
        evse,
        evseResponse.Locations[0].chargingPool[0].id,
      );
    }

    // cascade timestamps to parents : location
    const locationResponse = await this.ocpiGraphqlClient.request<
      UpdateLocationPatchMutationResult,
      UpdateLocationPatchMutationVariables
    >(UPDATE_LOCATION_PATCH_MUTATION, {
      id: location_id,
      changes: { updatedAt: evse.last_updated },
    });
    if (!locationResponse.update_Locations_by_pk?.id) {
      throw new Error(
        `Failed to update field: 'last updated' for location ${location_id}`,
      );
    }

    return undefined;
  }

  async putConnectorByCountryPartyAndId(
    countryCode: string,
    partyId: string,
    locationId: string,
    evseUid: string,
    connectorId: string,
    connector: ConnectorDTO,
    tenantPartner: TenantPartnerDto,
  ): Promise<LocationResponse | undefined> {
    this.logger.info(
      `Receiver PUT connector ${countryCode}/${partyId}/${locationId}/${evseUid}/${connectorId} body=${JSON.stringify(connector)}`,
    );

    if (!tenantPartner.id) {
      throw new UnauthorizedException('Credentials not found for given token');
    }
    const partnerErr = validateUrlMatchesTenantPartner(
      countryCode,
      partyId,
      tenantPartner,
    );
    if (partnerErr) return partnerErr;

    const variables = {
      locationId: locationId,
      partnerId: tenantPartner.id,
      evseUid: evseUid,
    };
    const lookupResponse = await this.ocpiGraphqlClient.request<
      GetEvseByOcpiIdAndPartnerIdQueryResult,
      GetEvseByOcpiIdAndPartnerIdQueryVariables
    >(GET_EVSE_BY_OCPI_ID_AND_PARTNER_ID_QUERY, variables);

    const chargingStation = lookupResponse?.Evses[0]?.ChargingStation;
    const evse = lookupResponse?.Evses[0];
    const evseOcpiUid = lookupResponse?.Evses[0]?.ocpiUid;
    const location = chargingStation?.location;

    if (!location) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        'Unknown location',
      ) as LocationResponse;
    }

    if (!evse || !evseOcpiUid) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        'Unknown EVSE',
      ) as LocationResponse;
    }

    const ts = new Date(connector.last_updated as any);

    await this.upsertConnectorForPartnerAndEvse(
      tenantPartner,
      connector,
      String(evse.id),
      evseOcpiUid,
      String(chargingStation.id),
    );

    // cascade timestamps to parents : location and evse
    const evseResponse = await this.ocpiGraphqlClient.request<
      UpdateEvsePatchMutationResult,
      UpdateEvsePatchMutationVariables
    >(UPDATE_EVSE_PATCH_MUTATION, {
      id: evse.id,
      changes: { updatedAt: ts },
    });
    if (!evseResponse.update_Evses_by_pk?.id) {
      throw new Error(
        `Failed to update field: 'last updated' for evse ${evse.id}`,
      );
    }
    const locationResponse = await this.ocpiGraphqlClient.request<
      UpdateLocationPatchMutationResult,
      UpdateLocationPatchMutationVariables
    >(UPDATE_LOCATION_PATCH_MUTATION, {
      id: location.id,
      changes: { updatedAt: ts },
    });
    if (!locationResponse.update_Locations_by_pk?.id) {
      throw new Error(
        `Failed to update field: 'last updated' for location ${location.id}`,
      );
    }
    return undefined;
  }

  mapLocationPatch(input: Partial<LocationDTO>): any {
    const out: any = {};

    const has = (obj: any, key: string) =>
      Object.prototype.hasOwnProperty.call(obj, key);

    if (has(input, 'name')) out.name = input.name ?? null;
    if (has(input, 'address')) out.address = input.address ?? null;
    if (has(input, 'city')) out.city = input.city ?? null;
    if (has(input, 'postal_code')) out.postalCode = input.postal_code ?? null;
    if (has(input, 'state')) out.state = input.state ?? null;
    if (has(input, 'country')) out.country = input.country ?? null;

    if (has(input, 'coordinates')) {
      out.coordinates = input.coordinates
        ? {
            type: 'Point',
            coordinates: [
              Number(input.coordinates.longitude),
              Number(input.coordinates.latitude),
            ],
          }
        : null;
    }

    if (has(input, 'parking_type'))
      out.parkingType = input.parking_type ?? null;
    if (has(input, 'time_zone')) out.timeZone = input.time_zone ?? null;
    if (has(input, 'operator')) out.operator = input.operator ?? null;
    if (has(input, 'suboperator')) out.suboperator = input.suboperator ?? null;
    if (has(input, 'owner')) out.owner = input.owner ?? null;
    if (has(input, 'publish_allowed_to'))
      out.publishAllowedTo = input.publish_allowed_to ?? null;
    if (has(input, 'publish')) out.publishUpstream = input.publish ?? null;
    if (has(input, 'related_locations'))
      out.relatedLocations = input.related_locations ?? null;
    if (has(input, 'charging_when_closed'))
      out.chargingWhenClosed = input.charging_when_closed ?? null;

    if (has(input, 'last_updated'))
      out.updatedAt = new Date(input.last_updated as any);

    return out;
  }

  async patchLocationByCountryPartyAndId(
    countryCode: string,
    partyId: string,
    locationId: string,
    location: Partial<LocationDTO>,
    tenantPartner: TenantPartnerDto,
  ): Promise<LocationResponse | undefined> {
    this.logger.info(
      `Receiver PATCH location ${countryCode}/${partyId}/${locationId} body=${JSON.stringify(location)}`,
    );

    if (!tenantPartner.id) {
      throw new UnauthorizedException('Credentials not found for given token');
    }
    const partnerErr = validateUrlMatchesTenantPartner(
      countryCode,
      partyId,
      tenantPartner,
    );
    if (partnerErr) return partnerErr;

    if (!location.last_updated) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientInvalidOrMissingParameters,
        'PATCH requires last_updated',
      ) as LocationResponse;
    }

    const variables = { partnerId: tenantPartner.id, locationId };
    const response = await this.ocpiGraphqlClient.request<
      GetPartnerLocationByOcpiIdQueryResult,
      GetPartnerLocationByOcpiIdQueryVariables
    >(GET_PARTNER_LOCATION_BY_OCPI_ID, variables);

    if (!response.Locations || response.Locations.length === 0) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        'Unknown location',
      ) as LocationResponse;
    }

    const dbLocationId = response.Locations[0].id;
    const locationPatch = this.mapLocationPatch(location);
    const locationResponse = await this.ocpiGraphqlClient.request<any, any>(
      UPDATE_LOCATION_PATCH_MUTATION,
      {
        id: dbLocationId,
        changes: locationPatch,
      },
    );
    if (!locationResponse.update_Locations_by_pk?.id) {
      throw new Error(
        `Failed to update location ${dbLocationId} with patch ${JSON.stringify(locationPatch)}`,
      );
    }

    return undefined;
  }

  mapEvsePatch(input: Partial<LocationEvseDTO>) {
    const out: any = {};

    const has = (obj: any, key: string) =>
      Object.prototype.hasOwnProperty.call(obj, key);

    if (has(input, 'status_schedule'))
      out.statusSchedule = input.status_schedule ?? null;
    if (has(input, 'capabilities'))
      out.capabilities = input.capabilities ?? null;

    if (has(input, 'evse_id')) out.evseId = input.evse_id ?? null;
    if (has(input, 'physical_reference'))
      out.physicalReference = input.physical_reference?.toString() ?? null;
    if (has(input, 'floor_level')) out.floorLevel = input.floor_level ?? null;

    if (has(input, 'coordinates')) {
      out.coordinates = input.coordinates
        ? {
            type: 'Point',
            coordinates: [
              Number(input.coordinates.longitude),
              Number(input.coordinates.latitude),
            ],
          }
        : null;
    }

    if (has(input, 'parking_restrictions'))
      out.parkingRestrictions = input.parking_restrictions ?? null;
    if (has(input, 'images')) out.images = input.images ?? null;
    if (has(input, 'directions')) out.directions = input.directions ?? null;
    if (has(input, 'status')) out.ocpiStatus = input.status ?? null;
    if (has(input, 'last_updated'))
      out.updatedAt = new Date(input.last_updated as any);

    return out;
  }

  async patchEvseByCountryPartyAndId(
    countryCode: string,
    partyId: string,
    locationId: string,
    evseUid: string,
    evse: Partial<LocationEvseDTO>,
    tenantPartner: TenantPartnerDto,
  ): Promise<LocationResponse | undefined> {
    this.logger.info(
      `Receiver PATCH evse ${countryCode}/${partyId}/${locationId}/${evseUid} body=${JSON.stringify(evse)}`,
    );
    if (!tenantPartner.id) {
      throw new UnauthorizedException('Credentials not found for given token');
    }
    const partnerErr = validateUrlMatchesTenantPartner(
      countryCode,
      partyId,
      tenantPartner,
    );
    if (partnerErr) return partnerErr;

    if (!evse.last_updated) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientInvalidOrMissingParameters,
        'PATCH requires last_updated',
      ) as LocationResponse;
    }

    const lookupResponse = await this.ocpiGraphqlClient.request<
      GetPartnerEvseByOcpiIdsQueryResult,
      GetPartnerEvseByOcpiIdsQueryVariables
    >(GET_PARTNER_EVSE_BY_OCPI_ID, {
      partnerId: tenantPartner.id,
      locationId: locationId,
      evseUid: evseUid,
    });

    if (!lookupResponse.Locations || lookupResponse.Locations.length === 0) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        'Unknown location',
      ) as LocationResponse;
    }

    const evses = lookupResponse.Locations[0]?.chargingPool?.[0]?.evses ?? [];
    if (evses.length === 0) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        'Unknown EVSE',
      ) as LocationResponse;
    }

    const dbEvseId = evses[0].id;
    const dbLocationId = lookupResponse.Locations[0].id;
    const evsePatch = this.mapEvsePatch(evse);

    const evseResponse = await this.ocpiGraphqlClient.request<
      UpdateEvsePatchMutationResult,
      UpdateEvsePatchMutationVariables
    >(UPDATE_EVSE_PATCH_MUTATION, {
      id: dbEvseId,
      changes: evsePatch,
    });
    if (!evseResponse.update_Evses_by_pk?.id) {
      throw new Error(
        `Failed to update evse ${dbEvseId} with patch ${JSON.stringify(evsePatch)}`,
      );
    }
    // cascade timestamps to parents : location
    const locationResponse = await this.ocpiGraphqlClient.request<
      UpdateLocationPatchMutationResult,
      UpdateLocationPatchMutationVariables
    >(UPDATE_LOCATION_PATCH_MUTATION, {
      id: dbLocationId,
      changes: { updatedAt: new Date(evse.last_updated as any) },
    });
    if (!locationResponse.update_Locations_by_pk?.id) {
      throw new Error(
        `Failed to update location field: 'last updated' for location ${dbLocationId}`,
      );
    }
    return undefined;
  }

  mapConnectorPatch(input: Partial<ConnectorDTO>) {
    const out: any = {};

    const has = (obj: any, key: string) =>
      Object.prototype.hasOwnProperty.call(obj, key);

    if (has(input, 'standard')) out.type = input.standard ?? null;
    if (has(input, 'format')) out.format = input.format ?? null;
    if (has(input, 'power_type')) out.powerType = input.power_type ?? null;

    if (has(input, 'max_voltage'))
      out.maximumVoltage = input.max_voltage ?? null;
    if (has(input, 'max_amperage'))
      out.maximumAmperage = input.max_amperage ?? null;
    if (has(input, 'max_electric_power'))
      out.maximumPowerWatts = input.max_electric_power ?? null;

    if (has(input, 'terms_and_conditions'))
      out.termsAndConditionsUrl = input.terms_and_conditions ?? null;

    if (has(input, 'last_updated')) {
      out.timestamp = input.last_updated;
      out.updatedAt = new Date(input.last_updated as any);
    }

    return out;
  }
  async patchConnectorByCountryPartyAndId(
    countryCode: string,
    partyId: string,
    locationId: string,
    evseUid: string,
    connectorId: string,
    connector: Partial<ConnectorDTO>,
    tenantPartner: TenantPartnerDto,
  ): Promise<LocationResponse | undefined> {
    this.logger.info(
      `Receiver PATCH connector ${countryCode}/${partyId}/${locationId}/${evseUid}/${connectorId} body=${JSON.stringify(connector)}`,
    );

    if (!tenantPartner.id) {
      throw new UnauthorizedException('Credentials not found for given token');
    }
    const partnerErr = validateUrlMatchesTenantPartner(
      countryCode,
      partyId,
      tenantPartner,
    );
    if (partnerErr) return partnerErr;

    if (!connector.last_updated) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientInvalidOrMissingParameters,
        'PATCH requires last_updated',
      ) as LocationResponse;
    }

    const lookupResponse = await this.ocpiGraphqlClient.request<
      GetPartnerConnectorByOcpiIdAndEvseIdQueryResult,
      GetPartnerConnectorByOcpiIdAndEvseIdQueryVariables
    >(GET_PARTNER_CONNECTOR_BY_OCPI_ID_AND_EVSE_ID, {
      partnerId: tenantPartner.id,
      locationId,
      evseUid,
      connectorId,
    });
    if (!lookupResponse.Locations || lookupResponse.Locations.length === 0) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        'Unknown location',
      ) as LocationResponse;
    }
    const locationNode = lookupResponse.Locations[0];
    const chargingPool = locationNode.chargingPool ?? [];
    const evses = chargingPool[0]?.evses ?? [];
    const connectors = evses[0]?.connectors ?? [];
    if (evses.length === 0) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        'Unknown EVSE',
      ) as LocationResponse;
    }
    if (connectors.length === 0) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        'Unknown connector',
      ) as LocationResponse;
    }
    const dbLocationId = locationNode.id;
    const dbEvseId = evses[0].id;
    const dbConnectorId = connectors[0].id;
    const connectorPatch = this.mapConnectorPatch(connector);

    await this.ocpiGraphqlClient.request<
      UpdateConnectorPatchMutationResult,
      UpdateConnectorPatchMutationVariables
    >(UPDATE_CONNECTOR_PATCH_MUTATION, {
      id: dbConnectorId,
      changes: connectorPatch,
    });

    if (connector.tariff_ids?.length) {
      // if there is other tariffs for this connector, delete them
      await this.deleteOcpiConnectorTariff(dbConnectorId, connectorId);
      for (const tariff of connector.tariff_ids) {
        const tariffResponse = await this.upsertTariffForPartnerAndConnector(
          tenantPartner,
          tariff,
          connectorId,
          dbConnectorId,
        );
        if (!tariffResponse.insert_ConnectorTariffs_one?.id) {
          throw new Error(`Failed to create or update tariff ${tariff}`);
        }
      }
    }

    // cascade timestamps to parents : evse and location
    const ts = new Date(connector.last_updated as any);
    await this.ocpiGraphqlClient.request<
      UpdateEvsePatchMutationResult,
      UpdateEvsePatchMutationVariables
    >(UPDATE_EVSE_PATCH_MUTATION, {
      id: dbEvseId,
      changes: { updatedAt: ts },
    });
    await this.ocpiGraphqlClient.request<
      UpdateLocationPatchMutationResult,
      UpdateLocationPatchMutationVariables
    >(UPDATE_LOCATION_PATCH_MUTATION, {
      id: dbLocationId,
      changes: { updatedAt: ts },
    });
    return undefined;
  }
}
