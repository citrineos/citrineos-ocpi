import { BaseClientApi } from './BaseClientApi';
import { OcpiResponse } from '../model/OcpiResponse';
import { Service } from 'typedi';
import { OcpiParams } from './util/OcpiParams';
import { OcpiEmptyResponse } from '../model/OcpiEmptyResponse';

@Service()
export class AsyncReceiverApi extends BaseClientApi {
  async postAsyncResponse(
    url: string,
    body: any,
    params: OcpiParams,
  ): Promise<OcpiResponse<void> | null> {
    params.authorization = await this.getAuthToken(
      params.fromCountryCode,
      params.fromPartyId,
      params.toCountryCode,
      params.toPartyId,
    );
    this.baseUrl = url;
    return this.create(
      OcpiEmptyResponse,
      {
        async: true,
        additionalHeaders: this.getOcpiHeaders(params),
      },
      body,
    );
  }
}
