// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ICommandsModuleApi } from './ICommandsModuleApi';
import {
  BadRequestError,
  Body,
  Ctx,
  JsonController,
  Param,
  Post,
} from 'routing-controllers';
import {
  CallAction,
  HttpStatus,
  ITenantPartnerDto,
  OCPP1_6,
  OCPP1_6_CALL_SCHEMA_MAP,
  OCPP1_6_CallAction,
  OCPPVersion,
} from '@citrineos/base';
import {
  AsOcpiFunctionalEndpoint,
  BaseController,
  CancelReservation,
  CancelReservationSchema,
  CancelReservationSchemaName,
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
import { Service } from 'typedi';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

/**
 * Server API for the provisioning component.
 */
@JsonController(`/:${versionIdParam}/${ModuleId.Commands}`)
@Service()
export class CommandsModuleApi
  extends BaseController
  implements ICommandsModuleApi
{
  private ajv: Ajv;
  
  constructor(readonly commandsService: CommandsService) {
    super();
    this.ajv = new Ajv({
      removeAdditional: 'all',
      useDefaults: true,
      coerceTypes: 'array',
      strict: false,
    });
    addFormats(this.ajv, {
      mode: 'fast',
      formats: ['date-time'],
    });
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

  @Post('/callback/:ocppVersion/:action/:commandId')
  async postAsynchronousResponse(
    @Param('ocppVersion') ocppVersion: OCPPVersion,
    @Param('action') action: CallAction,
    @Param('commandId') commandId: string,
    @Body() response: any,
  ): Promise<void> {
    let validatedResponse;
    switch (ocppVersion) {
      case OCPPVersion.OCPP1_6:
        switch (action) {
          case OCPP1_6_CallAction.RemoteStartTransaction:
            validatedResponse =
              this.validate<OCPP1_6.RemoteStartTransactionResponse>(
                ocppVersion,
                OCPP1_6_CALL_SCHEMA_MAP.get(action),
                response,
              );
            this.commandsService.handleRemoteStartTransactionResponse(
              validatedResponse,
              commandId,
            );
            return;
          default:
            throw new BadRequestError('Invalid action for OCPP 2.0.1');
        }

      case OCPPVersion.OCPP2_0_1:
        return;
      default:
        throw new BadRequestError('OCPP version not found');
    }
  }

  private validate<T>(protocol: string, schema: any, data: unknown): T {
    let validate = this.ajv.getSchema(schema['$id']);
    if (!validate) {
      schema['$id'] = `${protocol}-${schema['$id']}`;
      this.logger.debug(`Updated call result schema id: ${schema['$id']}`);
      validate = this.ajv.compile(schema);
    }

    if (!validate(data)) {
      const errors = validate.errors
        ?.map((err) => `${err.instancePath} ${err.message}`)
        .join(', ');
      throw new Error(`Validation failed: ${errors}`);
    }

    return data as T;
  }
}
