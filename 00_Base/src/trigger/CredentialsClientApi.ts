import { BaseClientApi, MissingRequiredParamException } from './BaseClientApi';
import { ModuleId } from '../model/ModuleId';
import { CredentialsResponse } from '../model/CredentialsResponse';
import { Service } from 'typedi';
import { OcpiEmptyResponse } from '../model/OcpiEmptyResponse';
import { PartnerProfile } from '@citrineos/base/dist/interfaces/dto/json/ocpi.registration';
import { OCPIRegistration } from '@citrineos/base';
import { EndpointIdentifier } from '../model/EndpointIdentifier';
import { CredentialsDTO } from '..';

@Service()
export class CredentialsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Credentials;

  getUrl(partnerProfile: PartnerProfile): string {
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
      'get',
      CredentialsResponse,
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
      'post',
      CredentialsResponse,
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
      'put',
      CredentialsResponse,
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
      'delete',
      OcpiEmptyResponse,
      partnerProfile,
      false,
    );
  }
}
