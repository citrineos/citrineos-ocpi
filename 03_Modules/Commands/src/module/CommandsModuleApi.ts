// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ICommandsModuleApi } from './ICommandsModuleApi';

import { Body, JsonController, Post } from 'routing-controllers';

import { plainToInstance } from 'class-transformer';

import { validate } from 'class-validator';

import { HttpStatus } from '@citrineos/base';
import {
  AsOcpiFunctionalEndpoint,
  BaseController,
  CancelReservation,
  CommandResponse,
  CommandsService,
  CommandType,
  EnumParam,
  FunctionalEndpointParams,
  generateMockOcpiResponse,
  ModuleId,
  MultipleTypes,
  OcpiHeaders,
  OcpiResponse,
  ReserveNow,
  ResponseGenerator,
  ResponseSchema,
  StartSession,
  StopSession,
  UnlockConnector,
  versionIdParam,
} from '@citrineos/ocpi-base';

import { Service } from 'typedi';

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
    commandType: CommandType,
    @Body()
    @MultipleTypes(
      CancelReservation,
      ReserveNow,
      StartSession,
      StopSession,
      UnlockConnector,
    )
    payload:
      | CancelReservation
      | ReserveNow
      | StartSession
      | StopSession
      | UnlockConnector,
    @FunctionalEndpointParams() ocpiHeader: OcpiHeaders,
  ): Promise<OcpiResponse<CommandResponse | undefined>> {
    console.log('postCommand', commandType, payload);
    switch (commandType) {
      case CommandType.CANCEL_RESERVATION:
        payload = plainToInstance(CancelReservation, payload);
        break;
      case CommandType.RESERVE_NOW:
        payload = plainToInstance(ReserveNow, payload);
        break;
      case CommandType.START_SESSION:
        payload = plainToInstance(StartSession, payload);
        break;
      case CommandType.STOP_SESSION:
        payload = plainToInstance(StopSession, payload);
        break;
      case CommandType.UNLOCK_CONNECTOR:
        payload = plainToInstance(UnlockConnector, payload);
        break;
      default:
        return ResponseGenerator.buildGenericClientErrorResponse(
          undefined,
          'Unknown command type: ' + commandType,
          undefined,
        );
    }

    return await validate(payload).then(async (errors) => {
      if (errors.length > 0) {
        const errorString = errors.map((error) => error.toString()).join(', ');
        return ResponseGenerator.buildGenericClientErrorResponse(
          undefined,
          errorString,
          undefined,
        );
      } else {
        return await this.commandsService.postCommand(
          commandType,
          payload,
          ocpiHeader.fromCountryCode,
          ocpiHeader.fromPartyId,
        );
      }
    });
  }
}
