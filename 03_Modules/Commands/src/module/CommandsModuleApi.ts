// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { ICommandsModuleApi } from './ICommandsModuleApi';
import { Body, Ctx, JsonController, Param, Post } from 'routing-controllers';
import { HttpStatus, ITenantPartnerDto, OCPPVersion } from '@citrineos/base';
import {
  AsAdminEndpoint,
  AsOcpiFunctionalEndpoint,
  BaseController,
  CancelReservation,
  CancelReservationSchema,
  CancelReservationSchemaName,
  CommandExecutor,
  CommandResponseSchema,
  CommandResponseSchemaName,
  CommandsService,
  CommandType,
  EnumParam,
  generateMockForSchema,
  ModuleId,
  MultipleTypes,
  OcpiCommandResponse,
  ReserveNow,
  ReserveNowSchema,
  ReserveNowSchemaName,
  ResponseGenerator,
  ResponseSchema,
  StartSession,
  StartSessionSchema,
  StartSessionSchemaName,
  StopSession,
  StopSessionSchema,
  StopSessionSchemaName,
  UnlockConnector,
  UnlockConnectorSchema,
  UnlockConnectorSchemaName,
  versionIdParam,
} from '@citrineos/ocpi-base';
import { Inject, Service } from 'typedi';

@JsonController(`/:${versionIdParam}/${ModuleId.Commands}`)
@Service()
export class CommandsModuleApi
  extends BaseController
  implements ICommandsModuleApi
{
  @Inject()
  private commandsExecutor!: CommandExecutor;

  constructor(readonly commandsService: CommandsService) {
    super();
  }

  @Post('/:commandType')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(CommandResponseSchema, CommandResponseSchemaName, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockForSchema(
        CommandResponseSchema,
        CommandResponseSchemaName,
      ),
    },
  })
  async postCommand(
    @EnumParam('commandType', CommandType, 'CommandType')
    commandType: CommandType,
    @Body() // todo use new @Body from ocpi-base
    @MultipleTypes(
      { schema: CancelReservationSchema, name: CancelReservationSchemaName },
      { schema: ReserveNowSchema, name: ReserveNowSchemaName },
      { schema: StartSessionSchema, name: StartSessionSchemaName },
      { schema: StopSessionSchema, name: StopSessionSchemaName },
      { schema: UnlockConnectorSchema, name: UnlockConnectorSchemaName },
    )
    payload:
      | CancelReservation
      | ReserveNow
      | StartSession
      | StopSession
      | UnlockConnector,
    @Ctx() ctx: any,
  ): Promise<OcpiCommandResponse> {
    this.logger.debug('postCommand', commandType, payload);
    let validationResult:
      | ReturnType<typeof CancelReservationSchema.safeParse>
      | ReturnType<typeof ReserveNowSchema.safeParse>
      | ReturnType<typeof StartSessionSchema.safeParse>
      | ReturnType<typeof StopSessionSchema.safeParse>
      | ReturnType<typeof UnlockConnectorSchema.safeParse>;
    switch (commandType) {
      case CommandType.CANCEL_RESERVATION:
        validationResult = CancelReservationSchema.safeParse(payload);
        break;
      case CommandType.RESERVE_NOW:
        validationResult = ReserveNowSchema.safeParse(payload);
        break;
      case CommandType.START_SESSION:
        validationResult = StartSessionSchema.safeParse(payload);
        break;
      case CommandType.STOP_SESSION:
        validationResult = StopSessionSchema.safeParse(payload);
        break;
      case CommandType.UNLOCK_CONNECTOR:
        validationResult = UnlockConnectorSchema.safeParse(payload);
        break;
      default:
        return ResponseGenerator.buildGenericClientErrorResponse(
          undefined,
          'Unknown command type: ' + commandType,
          undefined,
        ) as any;
    }

    if (!validationResult.success) {
      const errorString = validationResult.error.errors
        .map((error) => `${error.path.join('.')}: ${error.message}`)
        .join(', ');

      return ResponseGenerator.buildGenericClientErrorResponse(
        undefined,
        errorString,
      ) as any;
    }

    return await this.commandsService.postCommand(
      commandType,
      validationResult.data,
      ctx!.state!.tenantPartner as ITenantPartnerDto,
    );
  }

  @Post('/callback/:tenantPartnerId/:ocppVersion/:command/:commandId')
  @AsAdminEndpoint()
  async postAsynchronousResponse(
    @Param('tenantPartnerId') tenantPartnerId: number,
    @Param('ocppVersion') ocppVersion: OCPPVersion,
    @Param('command') command: CommandType,
    @Param('commandId') commandId: string,
    @Body() response: any,
  ): Promise<void> {
    await this.commandsExecutor.handleAsyncCommandResponse(
      tenantPartnerId,
      ocppVersion,
      command,
      commandId,
      response,
    );
  }
}
