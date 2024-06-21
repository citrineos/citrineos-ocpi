import { BaseClientApi } from './BaseClientApi';
import { OcpiResponse } from '../model/ocpi.response';
import {Service} from "typedi";

@Service()
export class AsyncReceiverApi extends BaseClientApi {
  async postAsyncResponse(
    url: string,
    body: any,
  ): Promise<OcpiResponse<void> | null> {
    return this.createRaw<OcpiResponse<void>>(url, body, {}).then(
      (response) => response.result,
    );
  }
}
