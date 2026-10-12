// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { BaseClientApi } from './BaseClientApi.js';
import type {
  ConnectorDTO,
  ConnectorResponse,
} from '../model/DTO/ConnectorDTO.js';
import { ConnectorResponseSchema } from '../model/DTO/ConnectorDTO.js';
import type {
  LocationDTO,
  LocationResponse,
} from '../model/DTO/LocationDTO.js';
import { LocationResponseSchema } from '../model/DTO/LocationDTO.js';
import type { OcpiEmptyResponse } from '../model/OcpiEmptyResponse.js';
import { OcpiEmptyResponseSchema } from '../model/OcpiEmptyResponse.js';
import type { EvseDTO, EvseResponse } from '../model/DTO/EvseDTO.js';
import { EvseResponseSchema, UID_FORMAT } from '../model/DTO/EvseDTO.js';
import { Service } from 'typedi';
import { ModuleId } from '../model/ModuleId.js';
import { EndpointIdentifier } from '../model/EndpointIdentifier.js';
import {
  type Endpoint,
  HttpMethod,
  type PartnerProfile,
} from '@zetra/citrineos-base';
import { EvseStatus } from '../model/EvseStatus.js';
import type {
  GetLocationByOcpiIdQueryResult,
  GetLocationByOcpiIdQueryVariables,
  GetOurLocationByIdQueryResult,
  GetOurLocationByIdQueryVariables,
} from '../graphql/index.js';
import { GET_LOCATION_BY_OCPID_ID_QUERY, GET_OUR_LOCATION_BY_ID_QUERY } from '../graphql/index.js';

@Service()
export class LocationsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Locations;

  getUrl(partnerProfile: PartnerProfile): string {
    const url = partnerProfile.endpoints?.find(
      (value: Endpoint) =>
        value.identifier === EndpointIdentifier.LOCATIONS_RECEIVER,
    )?.url;
    if (!url) {
      throw new Error(
        `No Locations endpoint available for partnerProfile ${JSON.stringify(partnerProfile)}`,
      );
    }
    return url;
  }

  async getConnector(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: PartnerProfile,
    locationId: string,
    evseUid: string,
    connectorId: string,
  ): Promise<ConnectorResponse> {
    const path = `${fromCountryCode}/${fromPartyId}/${locationId}/${evseUid}/${connectorId}`;
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Get,
      ConnectorResponseSchema,
      partnerProfile,
      true,
      `${this.getUrl(partnerProfile)}/${path}`,
    );
  }

  async getEvse(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: PartnerProfile,
    locationId: string,
    evseUid: string,
  ): Promise<EvseResponse> {
    const path = `${fromCountryCode}/${fromPartyId}/${locationId}/${evseUid}`;
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Get,
      EvseResponseSchema,
      partnerProfile,
      true,
      `${this.getUrl(partnerProfile)}/${path}`,
    );
  }

  async getLocation(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: PartnerProfile,
    locationId: string,
  ): Promise<LocationResponse> {
    const path = `${fromCountryCode}/${fromPartyId}/${locationId}`;
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Get,
      LocationResponseSchema,
      partnerProfile,
      true,
      `${this.getUrl(partnerProfile)}/${path}`,
    );
  }

  async patchConnector(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: PartnerProfile,
    locationId: string,
    evseUid: string,
    connectorId: string,
    requestBody: Partial<ConnectorDTO>,
  ): Promise<OcpiEmptyResponse> {
    const path = `${fromCountryCode}/${fromPartyId}/${locationId}/${evseUid}/${connectorId}`;
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Patch,
      OcpiEmptyResponseSchema,
      partnerProfile,
      true,
      `${this.getUrl(partnerProfile)}/${path}`,
      requestBody,
    );
  }

  async patchLocationEVSEStatus(
  fromCountryCode: string,
  fromPartyId: string,
  toCountryCode: string,
  toPartyId: string,
  partnerProfile: PartnerProfile,
  locationId: string,
  status: EvseStatus,
): Promise<OcpiEmptyResponse[]> {
  const lookup = await this.ocpiGraphqlClient.request<
    GetOurLocationByIdQueryResult, 
    GetOurLocationByIdQueryVariables
  >(GET_OUR_LOCATION_BY_ID_QUERY, { id: Number(locationId) });

  console.log('lookup : ', lookup);
  const evseUids =
    lookup.Locations?.[0]?.chargingPool?.flatMap((station) =>
      station.evses
        .filter((evse) => evse.id)
        .map((evse) => UID_FORMAT(station.id, evse.evseTypeId!)),
    ) ?? [];

  this.logger.info(`Patching EVSE status for location ${locationId} with ${evseUids.length} EVSEs to status ${status}`,
  );
  console.log('evseUids : ', evseUids);

  const last_updated = new Date();

  return Promise.all(
    evseUids.map((evseUid) =>
      this.patchEvse(
        fromCountryCode,
        fromPartyId,
        toCountryCode,
        toPartyId,
        partnerProfile,
        locationId,
        evseUid,
        { status, last_updated },
      ),
    ),
  );
}

  async patchEvse(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: PartnerProfile,
    locationId: string,
    evseUid: string,
    requestBody: Partial<EvseDTO>,
  ): Promise<OcpiEmptyResponse> {
    const path = `${fromCountryCode}/${fromPartyId}/${locationId}/${evseUid}`;
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Patch,
      OcpiEmptyResponseSchema,
      partnerProfile,
      true,
      `${this.getUrl(partnerProfile)}/${path}`,
      requestBody,
    );
  }

  async patchLocation(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: PartnerProfile,
    locationId: string,
    requestBody: Partial<LocationDTO>,
  ): Promise<OcpiEmptyResponse> {
    const path = `${fromCountryCode}/${fromPartyId}/${locationId}`;
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Patch,
      OcpiEmptyResponseSchema,
      partnerProfile,
      true,
      `${this.getUrl(partnerProfile)}/${path}`,
      requestBody,
    );
  }

  async putConnector(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: PartnerProfile,
    locationId: string,
    evseUid: string,
    connectorId: string,
    connector: ConnectorDTO,
  ): Promise<OcpiEmptyResponse> {
    const path = `${fromCountryCode}/${fromPartyId}/${locationId}/${evseUid}/${connectorId}`;
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Put,
      OcpiEmptyResponseSchema,
      partnerProfile,
      true,
      `${this.getUrl(partnerProfile)}/${path}`,
      connector,
    );
  }

  async putEvse(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: PartnerProfile,
    locationId: string,
    evseUid: string,
    evse: EvseDTO,
  ): Promise<OcpiEmptyResponse> {
    const path = `${fromCountryCode}/${fromPartyId}/${locationId}/${evseUid}`;
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Put,
      OcpiEmptyResponseSchema,
      partnerProfile,
      true,
      `${this.getUrl(partnerProfile)}/${path}`,
      evse,
    );
  }

  async putLocation(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: PartnerProfile,
    locationId: string,
    location: LocationDTO,
  ): Promise<OcpiEmptyResponse> {
    const path = `${fromCountryCode}/${fromPartyId}/${locationId}`;
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Put,
      OcpiEmptyResponseSchema,
      partnerProfile,
      true,
      `${this.getUrl(partnerProfile)}/${path}`,
      location,
    );
  }
}
