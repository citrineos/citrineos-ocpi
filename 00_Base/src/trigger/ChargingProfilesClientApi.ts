import { BaseClientApi } from './BaseClientApi';
import { PutChargingProfileParams } from './param/charging.profiles/put.charging.profile.params';
import { IHeaders } from 'typed-rest-client/Interfaces';
import { Service } from 'typedi';
import { UnsuccessfulRequestException } from '../exception/UnsuccessfulRequestException';
import { IRestResponse } from 'typed-rest-client';
import { OcpiStringResponse } from '../model/OcpiStringResponse';

@Service()
export class ChargingProfilesClientApi extends BaseClientApi {
  async putChargingProfile(
    params: PutChargingProfileParams,
  ): Promise<OcpiStringResponse> {
    let response: IRestResponse<OcpiStringResponse>;
    try {
      this.validateRequiredParam(params, 'url', 'activeChargingProfile');
      const additionalHeaders: IHeaders = this.getOcpiHeaders(params);

      response = await this.replaceRaw<OcpiStringResponse>(
        params.url,
        params.activeChargingProfile,
        { additionalHeaders },
      );
      return this.handleResponse(OcpiStringResponse, response);
    } catch (e) {
      console.error(`Could not put charging profile: ${e}`);
      throw new UnsuccessfulRequestException('Could not put charging profile.');
    }
  }
}
