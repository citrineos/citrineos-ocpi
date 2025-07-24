import { BaseClientApi } from './BaseClientApi';
import { Session, SessionResponse } from '../model/Session';
import { Service } from 'typedi';
import { OcpiEmptyResponse } from '../model/OcpiEmptyResponse';
import { ModuleId } from '../model/ModuleId';
import { EndpointIdentifier } from '../model/EndpointIdentifier';
import { OCPIRegistration } from '@citrineos/base';

@Service()
export class SessionsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Sessions;

  getUrl(partnerProfile: OCPIRegistration.PartnerProfile): string {
    const url = partnerProfile.endpoints?.find(
      (value: OCPIRegistration.Endpoint) =>
        value.identifier === EndpointIdentifier.SESSIONS_RECEIVER,
    )?.url;
    if (!url) {
      throw new Error(
        `No session endpoint available for patnerProfile ${JSON.stringify(partnerProfile)}`,
      );
    }
    return url;
  }

  async getSession(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
  ): Promise<SessionResponse> {
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      'get',
      SessionResponse,
      partnerProfile,
    );
  }

  async patchSession(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
    body: Partial<Session>,
  ): Promise<OcpiEmptyResponse> {
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      'patch',
      OcpiEmptyResponse,
      partnerProfile,
      true,
      undefined,
      body,
    );
  }

  async putSession(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
    body: Session,
  ): Promise<OcpiEmptyResponse> {
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      'put',
      OcpiEmptyResponse,
      partnerProfile,
      true,
      undefined,
      body,
    );
  }
}
