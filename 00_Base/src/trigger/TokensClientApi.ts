import { AuthorizationInfoResponse } from '../model/AuthorizationInfo';
import { BaseClientApi } from './BaseClientApi';
import { Service } from 'typedi';
import { ModuleId } from '../model/ModuleId';
import { OCPIRegistration } from '@citrineos/base';
import { EndpointIdentifier } from '../model/EndpointIdentifier';
import { PaginatedParams } from './param/PaginatedParams';
import { PaginatedTokenResponse } from '../model/DTO/TokenDTO';
import { TokenType } from '../model/TokenType';
import { LocationReferences } from '../model/LocationReferences';

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
        `No CDR endpoint available for partnerProfile ${JSON.stringify(partnerProfile)}`,
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
      'get',
      PaginatedTokenResponse,
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
      'post',
      AuthorizationInfoResponse,
      partnerProfile,
      true,
      `${this.getUrl(partnerProfile)}/${path}`,
      body,
      undefined,
      otherParams,
    );
  }
}
