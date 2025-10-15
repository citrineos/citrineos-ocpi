// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { BaseClientApi } from './BaseClientApi';
import { Service } from 'typedi';
import { ModuleId } from '../model/ModuleId';
import { HttpMethod, OCPIRegistration } from '@citrineos/base';
import { EndpointIdentifier } from '../model/EndpointIdentifier';
import { PaginatedParams } from './param/PaginatedParams';
import {
  PaginatedTokenResponse,
  PaginatedTokenResponseSchema,
} from '../model/DTO/TokenDTO';
import { TokenType } from '../model/TokenType';
import { LocationReferences } from '../model/LocationReferences';
import {
  AuthorizationInfoResponse,
  AuthorizationInfoResponseSchema,
} from '../model/AuthorizationInfo';

@Service()
export class TokensClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Tokens;

  getUrl(partnerProfile: OCPIRegistration.PartnerProfile): string {
    const url = partnerProfile.endpoints?.find(
      (value: OCPIRegistration.Endpoint) =>
        value.identifier === EndpointIdentifier.TOKENS_SENDER,
    )?.url;
    if (!url) {
      throw new Error(
        `No Tokens endpoint available for partnerProfile ${JSON.stringify(partnerProfile)}`,
      );
    }
    return url;
  }

  async getTokens(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
    paginatedParams: PaginatedParams,
  ): Promise<PaginatedTokenResponse> {
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Get,
      PaginatedTokenResponseSchema,
      partnerProfile,
      true,
      undefined,
      undefined,
      paginatedParams,
    );
  }

  async postToken(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
    tokenId: string,
    tokenType?: TokenType,
    body?: LocationReferences,
  ): Promise<AuthorizationInfoResponse> {
    const path = `${tokenId}/authorize`;
    const otherParams: Record<string, string> | undefined = tokenType && {
      type: tokenType,
    };
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Post,
      AuthorizationInfoResponseSchema,
      partnerProfile,
      true,
      `${this.getUrl(partnerProfile)}/${path}`,
      body,
      undefined,
      otherParams,
    );
  }
}
