import { BaseClientApi } from './BaseClientApi';
import { ChargingProfileResult } from '../model/ChargingProfileResult';
import { OcpiResponse } from '../model/ocpi.response';
import { DeleteChargingProfileParams } from './param/charging.profiles/delete.charging.profile.params';
import { GetChargingProfileParams } from './param/charging.profiles/get.charging.profile.params';
import { PutChargingProfileParams } from './param/charging.profiles/put.charging.profile.params';
import { ChargingProfileResponse } from '../model/ChargingProfileResponse';
import { IHeaders, IRequestQueryParams } from 'typed-rest-client/Interfaces';

export class ChargingProfilesClientApi extends BaseClientApi {
  async deleteChargingProfile(
    params: DeleteChargingProfileParams,
  ): Promise<OcpiResponse<ChargingProfileResult>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'sessionId', 'responseUrl');
    const queryParameters: IRequestQueryParams = this.newQueryParams();
    queryParameters.params['response_url'] = params.responseUrl;
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.del<OcpiResponse<ChargingProfileResult>>(
      {
        additionalHeaders,
        queryParameters,
      },
      `${encodeURIComponent(params.sessionId)}`,
    );
  }

  async getChargingProfile(
    params: GetChargingProfileParams,
  ): Promise<OcpiResponse<ChargingProfileResponse>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'sessionId', 'duration', 'responseUrl');
    const queryParameters: IRequestQueryParams = this.newQueryParams();
    queryParameters.params['duration'] = params.duration;
    queryParameters.params['response_url'] = params.responseUrl;
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get<OcpiResponse<ChargingProfileResponse>>(
      {
        additionalHeaders,
        queryParameters,
      },
      `${encodeURIComponent(params.sessionId)}`,
    );
  }

  async putChargingProfile(
    params: PutChargingProfileParams,
  ): Promise<OcpiResponse<ChargingProfileResponse>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'sessionId', 'setChargingProfile');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.replace<OcpiResponse<ChargingProfileResponse>>(
      {
        additionalHeaders,
      },
      params.setChargingProfile,
      `${encodeURIComponent(params.sessionId)}`,
    );
  }
}
