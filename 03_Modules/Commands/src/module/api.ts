// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {ICommandsModuleApi} from './interface';

import {
  AsOcpiFunctionalEndpoint,
  BaseController,
  CancelReservation,
  CommandsService,
  CommandType,
  EnumParam,
  generateMockOcpiResponse,
  ModuleId,
  MultipleTypes,
  OcpiCommandResponse,
  ReserveNow,
  ResponseSchema,
  StartSession,
  StopSession,
  UnlockConnector
} from '@citrineos/ocpi-base';
import {Body, Controller, Post,} from 'routing-controllers';
import {HttpStatus} from '@citrineos/base';

import {Service} from 'typedi';

/**
 * Server API for the provisioning component.
 */
@Controller(`/${ModuleId.Commands}`)
@Service()
export class CommandsModuleApi extends BaseController implements ICommandsModuleApi {
  constructor(readonly commandsService: CommandsService) {
    super();
  }

  @Post('/:commandType')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiCommandResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(OcpiCommandResponse),
    },
  })
  async postCommand(
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
    // return this.commandsService.postCommand(_commandType, _payload);
    return this.commandsService.postCommand(_commandType, _payload);
  }
}
