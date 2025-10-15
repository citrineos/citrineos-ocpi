// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { BaseClientApi, MissingRequiredParamException } from './BaseClientApi';
import { ModuleId } from '../model/ModuleId';
import {
  CredentialsResponse,
  CredentialsResponseSchema,
} from '../model/CredentialsResponse';
import { Service } from 'typedi';
import {
  OcpiEmptyResponse,
  OcpiEmptyResponseSchema,
} from '../model/OcpiEmptyResponse';
import { HttpMethod, OCPIRegistration } from '@citrineos/base';
import { EndpointIdentifier } from '../model/EndpointIdentifier';
import { CredentialsDTO } from '..';

@Service()
export class CredentialsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Credentials;

  getUrl(partnerProfile: OCPIRegistration.PartnerProfile): string {
    const url = partnerProfile.endpoints?.find(
      (value: OCPIRegistration.Endpoint) =>
        value.identifier === EndpointIdentifier.CREDENTIALS,
    )!.url;
    if (!url) {
      throw new MissingRequiredParamException(
        `${EndpointIdentifier.CREDENTIALS}.url`,
      );
    }
    return url;
  }

  async getCredentials(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
  ): Promise<CredentialsResponse> {
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Get,
      CredentialsResponseSchema,
      partnerProfile,
      false,
    );
  }

  async postCredentials(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
    body: CredentialsDTO,
  ): Promise<CredentialsResponse> {
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Post,
      CredentialsResponseSchema,
      partnerProfile,
      false,
      undefined,
      body,
    );
  }

  async putCredentials(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
    body: CredentialsDTO,
  ): Promise<CredentialsResponse> {
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Put,
      CredentialsResponseSchema,
      partnerProfile,
      false,
      undefined,
      body,
    );
  }

  async deleteCredentials(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
  ): Promise<OcpiEmptyResponse> {
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Delete,
      OcpiEmptyResponseSchema,
      partnerProfile,
      false,
    );
  }
}
