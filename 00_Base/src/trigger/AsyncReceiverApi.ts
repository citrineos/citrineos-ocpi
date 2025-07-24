import { BaseClientApi } from './BaseClientApi';
import { OcpiResponse } from '../model/OcpiResponse';
import { Service } from 'typedi';
import { OcpiEmptyResponse } from '../model/OcpiEmptyResponse';
import { OCPIRegistration } from '@citrineos/base';

@Service()
export class AsyncReceiverApi extends BaseClientApi {
  getUrl(): string {
    throw new Error('AsyncReceiverApi must be called with url.');
  }

  async postAsyncResponse(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
    url: string,
    body: any,
  ): Promise<OcpiResponse<void> | null> {
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      'post',
      OcpiEmptyResponse,
      partnerProfile,
      true,
      url,
      body,
    );
  }
}
