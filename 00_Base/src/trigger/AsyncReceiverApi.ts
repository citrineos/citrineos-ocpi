import { BaseClientApi } from './BaseClientApi';
import { OcpiResponse } from '../model/ocpi.response';
import { Service } from 'typedi';
import { OcpiParams } from './util/ocpi.params';
import { OcpiEmptyResponse } from '../model/ocpi.empty.response';

@Service()
export class AsyncReceiverApi extends BaseClientApi {
  async postAsyncResponse(
    url: string,
    body: any,
    params?: OcpiParams,
  ): Promise<OcpiResponse<void> | null> {
    if (params) {
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
    } else {
      return this.createRaw<OcpiResponse<void>>(url, body, {}).then(
        (response) => response.result,
      );
    }
  }
}
