import {Body, Controller, Param, Post} from 'routing-controllers';
import {HttpStatus} from '@citrineos/base';
import {BaseController} from './base.controller';
import {AsOcpiFunctionalEndpoint} from '../util/decorators/as.ocpi.functional.endpoint';
import {CommandType} from '../model/CommandType';
import {CancelReservation} from '../model/CancelReservation';
import {ReserveNow} from '../model/ReserveNow';
import {StartSession} from '../model/StartSession';
import {StopSession} from '../model/StopSession';
import {UnlockConnector} from '../model/UnlockConnector';
import {OcpiCommandResponse} from '../model/CommandResponse';
import {ResponseSchema} from '../openapi-spec-helper';
import {MultipleTypes} from '../util/decorators/multiple.types';
import {Service} from 'typedi';
import {ModuleId} from "../model/ModuleId";

@Controller(`/${ModuleId.Commands}`)
@Service()
export class CommandsController extends BaseController {

  @Post('/:commandType')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiCommandResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async postCommand(
    @Param('commandType')
      _commandType: CommandType,
    @Body()
    @MultipleTypes(CancelReservation, ReserveNow, StartSession, StopSession, UnlockConnector)
      _payload: CancelReservation | ReserveNow | StartSession | StopSession | UnlockConnector
  ): Promise<OcpiCommandResponse> {
    console.log('postCommand', _commandType, _payload);
    return this.generateMockOcpiResponse(OcpiCommandResponse);
  }
}
