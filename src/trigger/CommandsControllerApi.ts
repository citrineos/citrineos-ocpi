import {getOcpiHeaders, } from './util';
import {BaseApi, OcpiModules} from './BaseApi';
import {CommandResponse} from '../model/CommandResponse';
import {OcpiResponse} from '../model/ocpi.response';
import {PostCommandParams} from './param/commands/post.command.params';
import {IHeaders} from 'typed-rest-client/Interfaces';

export class CommandsControllerApi extends BaseApi {

  CONTROLLER_PATH = OcpiModules.Commands;

  async postCommand(
    params: PostCommandParams
  ): Promise<OcpiResponse<CommandResponse>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'url', 'commandResult');
    const additionalHeaders: IHeaders = getOcpiHeaders(params);
    return await this.create<OcpiResponse<CommandResponse>>({
      version: params.version,
      additionalHeaders,
    }, params.commandResult);
  }
}
