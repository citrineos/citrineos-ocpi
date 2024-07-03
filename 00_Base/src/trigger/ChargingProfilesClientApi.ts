import { BaseClientApi } from './BaseClientApi';
import { ChargingProfileResultResponse } from '../model/ChargingProfileResult';
import { DeleteChargingProfileParams } from './param/charging.profiles/delete.charging.profile.params';
import { GetChargingProfileParams } from './param/charging.profiles/get.charging.profile.params';
import { PutChargingProfileParams } from './param/charging.profiles/put.charging.profile.params';
import { ChargingProfileResponseResponse } from '../model/ChargingProfileResponse';
import { IHeaders, IRequestQueryParams } from 'typed-rest-client/Interfaces';

export class ChargingProfilesClientApi extends BaseClientApi {
  async deleteChargingProfile(
    params: DeleteChargingProfileParams,
  ): Promise<ChargingProfileResultResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'sessionId', 'responseUrl');
    const queryParameters: IRequestQueryParams = this.newQueryParams();
    queryParameters.params['response_url'] = params.responseUrl;
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.del(ChargingProfileResultResponse, {
      version: params.version,
      path: `${encodeURIComponent(params.sessionId)}`,
      additionalHeaders,
      queryParameters,
    });
  }

  async getChargingProfile(
    params: GetChargingProfileParams,
  ): Promise<ChargingProfileResponseResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'sessionId', 'duration', 'responseUrl');
    const queryParameters: IRequestQueryParams = this.newQueryParams();
    queryParameters.params['duration'] = params.duration;
    queryParameters.params['response_url'] = params.responseUrl;
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get(ChargingProfileResponseResponse, {
      version: params.version,
      path: `${encodeURIComponent(params.sessionId)}`,
      additionalHeaders,
      queryParameters,
    });
  }

  async putChargingProfile(
    params: PutChargingProfileParams,
  ): Promise<ChargingProfileResponseResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'sessionId', 'setChargingProfile');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.replace(
      ChargingProfileResponseResponse,
      {
        version: params.version,
        path: `${encodeURIComponent(params.sessionId)}`,
        additionalHeaders,
      },
      params.setChargingProfile,
    );
  }
}
