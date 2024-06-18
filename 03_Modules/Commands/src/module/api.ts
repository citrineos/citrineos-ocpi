// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ICommandsModuleApi } from './interface';

import { plainToInstance } from 'class-transformer';

import { validate } from 'class-validator';

import { Body, Controller, Post, BadRequestError } from 'routing-controllers';
import { HttpStatus } from '@citrineos/base';
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
  ReserveNow,
  ResponseSchema,
  StartSession,
  StopSession,
  UnlockConnector,
  OcpiResponse,
  CommandResponse,
} from '@citrineos/ocpi-base';

import { Service } from 'typedi';
import { versionIdParam } from '@citrineos/ocpi-base';
import { JsonController } from 'routing-controllers';

/**
 * Server API for the provisioning component.
 */
@JsonController(`/:${versionIdParam}/${ModuleId.Commands}`)
@Service()
export class CommandsModuleApi
  extends BaseController
  implements ICommandsModuleApi
{
  constructor(readonly commandsService: CommandsService) {
    super();
  }

  @Post('/:commandType')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiResponse<CommandResponse>, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(OcpiResponse<CommandResponse>),
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
  ): Promise<OcpiResponse<CommandResponse>> {
    console.log('postCommand', _commandType, _payload);
    switch (_commandType) {
      case CommandType.CANCEL_RESERVATION: {
        _payload = plainToInstance(CancelReservation, _payload);
        break;
      }
      case CommandType.RESERVE_NOW: {
        _payload = plainToInstance(ReserveNow, _payload);
        break;
      }
      case CommandType.START_SESSION: {
        _payload = plainToInstance(StartSession, _payload);
        break;
      }
      case CommandType.STOP_SESSION: {
        _payload = plainToInstance(StopSession, _payload);
        break;
      }
      case CommandType.UNLOCK_CONNECTOR: {
        _payload = plainToInstance(UnlockConnector, _payload);
        break;
      }
      default: {
        throw new BadRequestError('Unknown command type: ' + _commandType);
      }
    }

    await validate(_payload).then((errors) => {
      if (errors.length > 0) {
        throw new BadRequestError('Validation failed: ' + errors);
      }
    });
    return this.commandsService.postCommand(_commandType, _payload);
  }
}
