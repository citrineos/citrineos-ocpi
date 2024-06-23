import { BaseClientApi } from './BaseClientApi';
import { OcpiResponse } from '../model/ocpi.response';
import { CommandResult } from '../model/CommandResult';
import { Service } from 'typedi';

@Service()
export class CommandsClientApi extends BaseClientApi {
  async postCommandResult(
    url: string,
    body: CommandResult,
  ): Promise<OcpiResponse<string> | null> {
    return this.createRaw<OcpiResponse<string>>(url, body, {}).then(
      (response) => response.result,
    );
  }
}
