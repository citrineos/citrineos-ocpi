// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { BaseClientApi } from './BaseClientApi';
import {
  ConnectorDTO,
  ConnectorResponse,
  ConnectorResponseSchema,
} from '../model/DTO/ConnectorDTO';
import {
  LocationDTO,
  LocationResponse,
  LocationResponseSchema,
} from '../model/DTO/LocationDTO';
import {
  OcpiEmptyResponse,
  OcpiEmptyResponseSchema,
} from '../model/OcpiEmptyResponse';
import {
  EvseDTO,
  EvseResponse,
  EvseResponseSchema,
} from '../model/DTO/EvseDTO';
import { Service } from 'typedi';
import { ModuleId } from '../model/ModuleId';
import { EndpointIdentifier } from '../model/EndpointIdentifier';
import { HttpMethod, OCPIRegistration } from '@citrineos/base';

@Service()
export class LocationsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Locations;

  getUrl(partnerProfile: OCPIRegistration.PartnerProfile): string {
    const url = partnerProfile.endpoints?.find(
      (value: OCPIRegistration.Endpoint) =>
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
    partnerProfile: OCPIRegistration.PartnerProfile,
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
    partnerProfile: OCPIRegistration.PartnerProfile,
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
    partnerProfile: OCPIRegistration.PartnerProfile,
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
    partnerProfile: OCPIRegistration.PartnerProfile,
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

  async patchEvse(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
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
    partnerProfile: OCPIRegistration.PartnerProfile,
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
    partnerProfile: OCPIRegistration.PartnerProfile,
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
    partnerProfile: OCPIRegistration.PartnerProfile,
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
    partnerProfile: OCPIRegistration.PartnerProfile,
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
