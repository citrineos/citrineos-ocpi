import { BaseClientApi } from './BaseClientApi';
import { CommandResponse } from '../model/CommandResponse';
import { OcpiResponse } from '../model/ocpi.response';
import { PostCommandParams } from './param/commands/post.command.params';
import { IHeaders } from 'typed-rest-client/Interfaces';
import { ModuleId } from '../model/ModuleId';

export class CommandsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Commands;

  async postCommand(
    params: PostCommandParams,
  ): Promise<OcpiResponse<CommandResponse>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'url', 'commandResult');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.create<OcpiResponse<CommandResponse>>(
      {
        additionalHeaders,
      },
      params.commandResult,
    );
  }
}
