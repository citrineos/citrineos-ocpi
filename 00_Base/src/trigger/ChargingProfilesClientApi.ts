import { BaseClientApi } from './BaseClientApi';
import { OcpiResponse } from '../model/ocpi.response';
import { PutChargingProfileParams } from './param/charging.profiles/put.charging.profile.params';
import { IHeaders } from 'typed-rest-client/Interfaces';
import {Service} from "typedi";
import {UnsuccessfulRequestException} from "../exception/UnsuccessfulRequestException";
import {IRestResponse} from "typed-rest-client";

@Service()
export class ChargingProfilesClientApi extends BaseClientApi {
  async putChargingProfile(
    params: PutChargingProfileParams,
  ): Promise<OcpiResponse<string>> {
    let response: IRestResponse<OcpiResponse<string>>;
    try {
      this.validateRequiredParam(params, 'url', 'activeChargingProfile');
      const additionalHeaders: IHeaders = this.getOcpiHeaders(params);

      response = await this.replaceRaw<OcpiResponse<string>>(params.url, params.activeChargingProfile, {additionalHeaders});
      return this.handleResponse(response);
    } catch (e) {
      console.error(`Could not put charging profile: ${e}`);
      throw new UnsuccessfulRequestException(
          'Could not put charging profile.',
      );
    }
  }
}
