import {BaseClientApi} from './BaseClientApi';
import {OcpiResponse} from '../model/ocpi.response';
import {CommandResult} from '../model/CommandResult';
import {Service} from 'typedi';

@Service()
export class CommandsClientApi extends BaseClientApi {

  // todo I think we need the validate and get ocpi headers helpers
  /*async postCommand(
    params: PostCommandParams,
  ): Promise<OcpiResponse<CommandResponse>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'url', 'commandResult');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.create<OcpiResponse<CommandResponse>>(
      {
        additionalHeaders,
      },
      params.commandResult
  });*/
  async postCommandResult(
    url: string,
    body: CommandResult,
  ): Promise<OcpiResponse<string> | null> {
    return this.createRaw<OcpiResponse<string>>(url, body, {}).then(
      (response) => response.result,
    );
  }
}
