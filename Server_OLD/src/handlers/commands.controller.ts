import {Body, JsonController, Post} from 'routing-controllers';
import {HttpStatus} from '@citrineos/base';
import {BaseController, generateMockOcpiResponse} from './base.controller';
import {AsOcpiFunctionalEndpoint} from '../util/decorators/as.ocpi.functional.endpoint';
import {CommandType} from '../model/CommandType';
import {CancelReservation} from '../model/CancelReservation';
import {ReserveNow} from '../model/ReserveNow';
import {StartSession} from '../model/StartSession';
import {StopSession} from '../model/StopSession';
import {UnlockConnector} from '../model/UnlockConnector';
import {OcpiCommandResponse} from '../model/CommandResponse';
import {MultipleTypes} from '../util/decorators/multiple.types';
import {Service} from 'typedi';
import {ModuleId} from '../model/ModuleId';
import {EnumParam} from '../util/decorators/enum.param';
import {versionIdParam, VersionNumberParam} from "../util/decorators/version.number.param";
import {VersionNumber} from "../model/VersionNumber";
import {ResponseSchema} from '../../../00_Base/src/openapi-spec-helper';
import {CommandsService} from "../../../00_Base/src/services/commands.service";

const MOCK = generateMockOcpiResponse(OcpiCommandResponse);

@JsonController(`/:${versionIdParam}/${ModuleId.Commands}`)
@Service()
export class CommandsController extends BaseController {
  constructor(readonly commandsService: CommandsService) {
    super();
  }

  @Post('/:commandType')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiCommandResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK
      },
    },
  })
  async postCommand(
    @VersionNumberParam() _version: VersionNumber,
    @EnumParam('commandType', CommandType, 'CommandType')
      _commandType: CommandType,
    @Body()
    @MultipleTypes(
      CancelReservation,
      ReserveNow,
      StartSession,
      StopSession,
      UnlockConnector,
    )
      _payload:
      | CancelReservation
      | ReserveNow
      | StartSession
      | StopSession
      | UnlockConnector,
  ): Promise<OcpiCommandResponse> {
    console.log('postCommand', _commandType, _payload);
    return this.commandsService.postCommand(_commandType, _payload);
  }
}
