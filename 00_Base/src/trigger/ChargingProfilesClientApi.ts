import { BaseClientApi } from './BaseClientApi';
import { OcpiResponse } from '../model/ocpi.response';
import { Service } from 'typedi';
import { ChargingProfileResult } from "../model/ChargingProfileResult";

@Service()
export class ChargingProfilesClientApi extends BaseClientApi {
  async postSetChargingProfileResult(
    url: string,
    body: ChargingProfileResult,
  ): Promise<OcpiResponse<string> | null> {
    return this.createRaw<OcpiResponse<string>>(url, body, {}).then(
      (response) => response.result,
    );
  }
}
