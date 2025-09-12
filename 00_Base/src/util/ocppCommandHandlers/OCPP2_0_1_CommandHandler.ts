// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import {
  ChargingStationSequenceType,
  IChargingStationDto,
  ITenantPartnerDto,
  OCPP2_0_1,
  OCPPVersion,
} from '@citrineos/base';
import { IRequestOptions } from 'typed-rest-client';
import { Service } from 'typedi';
import { OCPP_COMMAND_HANDLER, OCPPCommandHandler } from './base';
import { StartSession } from '../../model/StartSession';
import { IRequestQueryParams } from 'typed-rest-client/Interfaces';
import { OCPP2_0_1_Mapper } from '@citrineos/data';
import {
  GetSequenceQueryResult,
  GetSequenceQueryVariables,
  UpsertSequenceMutationResult,
  UpsertSequenceMutationVariables,
} from '../../graphql/operations';
import {
  GET_SEQUENCE,
  UPSERT_SEQUENCE,
} from '../../graphql/queries/chargingStationSequence.queries';
import { TokensMapper } from '../../mapper/TokensMapper';
import { EXTRACT_EVSE_ID } from '../../model/DTO/EvseDTO';
import { CommandType } from '../../model/CommandType';
import { StopSession } from '../../model/StopSession';
import { CommandResultType, UnlockConnector } from '../..';

@Service({ id: OCPP_COMMAND_HANDLER, multiple: true })
export class OCPP2_0_1_CommandHandler extends OCPPCommandHandler {
  public readonly supportedVersion = OCPPVersion.OCPP2_0_1;

  public async sendStartSessionCommand(
    startSession: StartSession,
    tenantPartner: ITenantPartnerDto,
    chargingStation: IChargingStationDto,
    commandId: string,
  ): Promise<void> {
    const options: IRequestOptions = {
      additionalHeaders: this.config.commands.coreHeaders,
    };
    const queryParameters: IRequestQueryParams = {
      params: {},
    };
    queryParameters.params['identifier'] = chargingStation.id;
    queryParameters.params['tenantId'] = tenantPartner.tenant!.id!;
    queryParameters.params['callbackUrl'] =
      this.config.commands.ocpiBaseUrl +
      `/2.2.1/commands/callback/${tenantPartner.id}/${this.supportedVersion}/${CommandType.START_SESSION}/${commandId}`;
    options.queryParameters = queryParameters;

    const sequenceResponse = await this.ocpiGraphqlClient.request<
      GetSequenceQueryResult,
      GetSequenceQueryVariables
    >(GET_SEQUENCE, {
      tenantId: tenantPartner.tenant!.id!,
      stationId: chargingStation.id,
      type: ChargingStationSequenceType.remoteStartId,
    });
    let remoteStartId =
      sequenceResponse.ChargingStationSequences[0]?.value || 0;
    remoteStartId++;
    this.ocpiGraphqlClient.request<
      UpsertSequenceMutationResult,
      UpsertSequenceMutationVariables
    >(UPSERT_SEQUENCE, {
      tenantId: tenantPartner.tenant!.id!,
      stationId: chargingStation.id,
      type: ChargingStationSequenceType.remoteStartId,
      value: remoteStartId,
      createdAt: new Date().toISOString(),
    });

    const requestStartTransactionRequest: OCPP2_0_1.RequestStartTransactionRequest =
      {
        remoteStartId,
        idToken: {
          idToken: startSession.token.uid,
          type: OCPP2_0_1_Mapper.AuthorizationMapper.toIdTokenEnumType(
            TokensMapper.mapOcpiTokenTypeToOcppIdTokenType(
              startSession.token.type,
            ),
          ),
        },
        evseId: Number(EXTRACT_EVSE_ID(startSession.evse_uid!)),
      };
    await this.sendOCPPMessage(
      this.config.commands.ocpp2_0_1.requestStartTransactionRequestUrl,
      requestStartTransactionRequest,
      options,
      tenantPartner,
      startSession.response_url,
      commandId,
    );
  }

  public async sendStopSessionCommand(
    stopSession: StopSession,
    tenantPartner: ITenantPartnerDto,
    chargingStation: IChargingStationDto,
    commandId: string,
  ): Promise<void> {
    const options: IRequestOptions = {
      additionalHeaders: this.config.commands.coreHeaders,
    };
    const queryParameters: IRequestQueryParams = {
      params: {},
    };
    queryParameters.params['identifier'] = chargingStation.id;
    queryParameters.params['tenantId'] = tenantPartner.tenant!.id!;
    queryParameters.params['callbackUrl'] =
      this.config.commands.ocpiBaseUrl +
      `/2.2.1/commands/callback/${tenantPartner.id}/${this.supportedVersion}/${CommandType.STOP_SESSION}/${commandId}`;
    options.queryParameters = queryParameters;

    const requestStopTransactionRequest: OCPP2_0_1.RequestStopTransactionRequest =
      {
        transactionId: stopSession.session_id,
      };
    await this.sendOCPPMessage(
      this.config.commands.ocpp2_0_1.requestStopTransactionRequestUrl,
      requestStopTransactionRequest,
      options,
      tenantPartner,
      stopSession.response_url,
      commandId,
    );
  }

  public async sendUnlockConnectorCommand(
    unlockConnector: UnlockConnector,
    tenantPartner: ITenantPartnerDto,
    chargingStation: IChargingStationDto,
    commandId: string,
  ): Promise<void> {
    const options: IRequestOptions = {
      additionalHeaders: this.config.commands.coreHeaders,
    };
    const queryParameters: IRequestQueryParams = {
      params: {},
    };
    queryParameters.params['identifier'] = chargingStation.id;
    queryParameters.params['tenantId'] = tenantPartner.tenant!.id!;
    queryParameters.params['callbackUrl'] =
      this.config.commands.ocpiBaseUrl +
      `/2.2.1/commands/callback/${tenantPartner.id}/${this.supportedVersion}/${CommandType.UNLOCK_CONNECTOR}/${commandId}`;
    options.queryParameters = queryParameters;

    const evseTypeId = Array.from(chargingStation.evses || []).find(
      (evse) => evse.id === Number(EXTRACT_EVSE_ID(unlockConnector.evse_uid)),
    )?.evseTypeId;
    const evseTypeConnectorId = Array.from(
      chargingStation.connectors || [],
    ).find(
      (connector) => connector.id === Number(unlockConnector.connector_id),
    )?.evseTypeConnectorId;
    if (evseTypeId === undefined || evseTypeConnectorId === undefined) {
      this.logger.error('UnlockConnector failed, EVSE or Connector not found', {
        unlockConnector,
      });
      this.commandsClientApi.postCommandResult(
        tenantPartner.countryCode!,
        tenantPartner.partyId!,
        tenantPartner.tenant!.countryCode!,
        tenantPartner.tenant!.partyId!,
        tenantPartner.partnerProfileOCPI!,
        unlockConnector.response_url,
        {
          result: CommandResultType.FAILED,
          message: {
            language: 'en',
            text: 'Charging station communication failed',
          },
        },
        commandId,
      );
      return;
    }
    const unlockConnectorRequest: OCPP2_0_1.UnlockConnectorRequest = {
      evseId: evseTypeId,
      connectorId: evseTypeConnectorId,
    };
    await this.sendOCPPMessage(
      this.config.commands.ocpp2_0_1.unlockConnectorRequestUrl,
      unlockConnectorRequest,
      options,
      tenantPartner,
      unlockConnector.response_url,
      commandId,
    );
  }

  public async handleAsyncCommandResponse(
    tenantPartner: ITenantPartnerDto,
    command: CommandType,
    responseUrl: string,
    response: any,
    commandId: string,
  ): Promise<void> {
    switch (command) {
      case CommandType.START_SESSION:
        return this.handleRequestStartTransactionResponse(
          tenantPartner,
          responseUrl,
          response,
          commandId,
        );
      case CommandType.STOP_SESSION:
        return this.handleRequestStopTransactionResponse(
          tenantPartner,
          responseUrl,
          response,
          commandId,
        );
      case CommandType.UNLOCK_CONNECTOR:
        return this.handleUnlockConnectorResponse(
          tenantPartner,
          responseUrl,
          response,
          commandId,
        );
      default:
        throw new Error(`Unknown command type: ${command}`);
    }
  }

  private async handleRequestStartTransactionResponse(
    tenantPartner: ITenantPartnerDto,
    responseUrl: string,
    response: any,
    commandId: string,
  ): Promise<void> {
    const validatedResponse =
      this.validate<OCPP2_0_1.RequestStartTransactionResponse>(
        this.supportedVersion,
        OCPP2_0_1.RequestStartTransactionResponseSchema,
        response,
      );

    switch (validatedResponse.status) {
      case OCPP2_0_1.RequestStartStopStatusEnumType.Accepted:
        await this.commandsClientApi.postCommandResult(
          tenantPartner.countryCode!,
          tenantPartner.partyId!,
          tenantPartner.tenant!.countryCode!,
          tenantPartner.tenant!.partyId!,
          tenantPartner.partnerProfileOCPI!,
          responseUrl,
          {
            result: CommandResultType.ACCEPTED,
            message: {
              language: 'en',
              text: 'Charging station start session successful',
            },
          },
          commandId,
        );
        return;
      case OCPP2_0_1.RequestStartStopStatusEnumType.Rejected:
        this.logger.warn(`Start session rejected by charging station`, {
          statusInfo: validatedResponse.statusInfo,
        });
        await this.commandsClientApi.postCommandResult(
          tenantPartner.countryCode!,
          tenantPartner.partyId!,
          tenantPartner.tenant!.countryCode!,
          tenantPartner.tenant!.partyId!,
          tenantPartner.partnerProfileOCPI!,
          responseUrl,
          {
            result: CommandResultType.EVSE_OCCUPIED,
            message: {
              language: 'en',
              text: 'Charging station already in use',
            },
          },
          commandId,
        );
        return;
    }
  }

  private async handleRequestStopTransactionResponse(
    tenantPartner: ITenantPartnerDto,
    responseUrl: string,
    response: any,
    commandId: string,
  ): Promise<void> {
    const validatedResponse =
      this.validate<OCPP2_0_1.RequestStopTransactionResponse>(
        this.supportedVersion,
        OCPP2_0_1.RequestStopTransactionResponseSchema,
        response,
      );

    switch (validatedResponse.status) {
      case OCPP2_0_1.RequestStartStopStatusEnumType.Accepted:
        await this.commandsClientApi.postCommandResult(
          tenantPartner.countryCode!,
          tenantPartner.partyId!,
          tenantPartner.tenant!.countryCode!,
          tenantPartner.tenant!.partyId!,
          tenantPartner.partnerProfileOCPI!,
          responseUrl,
          {
            result: CommandResultType.ACCEPTED,
            message: {
              language: 'en',
              text: 'Charging station stop session successful',
            },
          },
          commandId,
        );
        return;
      case OCPP2_0_1.RequestStartStopStatusEnumType.Rejected:
        this.logger.warn(`Stop session rejected by charging station`, {
          statusInfo: validatedResponse.statusInfo,
        });
        await this.commandsClientApi.postCommandResult(
          tenantPartner.countryCode!,
          tenantPartner.partyId!,
          tenantPartner.tenant!.countryCode!,
          tenantPartner.tenant!.partyId!,
          tenantPartner.partnerProfileOCPI!,
          responseUrl,
          {
            result: CommandResultType.REJECTED,
            message: {
              language: 'en',
              text: 'Charging station rejected stop session',
            },
          },
          commandId,
        );
        return;
    }
  }

  private async handleUnlockConnectorResponse(
    tenantPartner: ITenantPartnerDto,
    responseUrl: string,
    response: any,
    commandId: string,
  ): Promise<void> {
    const validatedResponse = this.validate<OCPP2_0_1.UnlockConnectorResponse>(
      this.supportedVersion,
      OCPP2_0_1.UnlockConnectorResponseSchema,
      response,
    );

    switch (validatedResponse.status) {
      case OCPP2_0_1.UnlockStatusEnumType.Unlocked:
        await this.commandsClientApi.postCommandResult(
          tenantPartner.countryCode!,
          tenantPartner.partyId!,
          tenantPartner.tenant!.countryCode!,
          tenantPartner.tenant!.partyId!,
          tenantPartner.partnerProfileOCPI!,
          responseUrl,
          {
            result: CommandResultType.ACCEPTED,
            message: {
              language: 'en',
              text: 'Charging station unlock connector successful',
            },
          },
          commandId,
        );
        return;
      case OCPP2_0_1.UnlockStatusEnumType.OngoingAuthorizedTransaction:
        this.logger.warn(`Unlock connector ongoing authorized transaction`, {
          statusInfo: validatedResponse.statusInfo,
        });
        await this.commandsClientApi.postCommandResult(
          tenantPartner.countryCode!,
          tenantPartner.partyId!,
          tenantPartner.tenant!.countryCode!,
          tenantPartner.tenant!.partyId!,
          tenantPartner.partnerProfileOCPI!,
          responseUrl,
          {
            result: CommandResultType.EVSE_OCCUPIED,
            message: {
              language: 'en',
              text: 'Charging station already in use',
            },
          },
          commandId,
        );
        return;
      case OCPP2_0_1.UnlockStatusEnumType.UnknownConnector:
        this.logger.warn(`Unlock connector unknown connector`, {
          statusInfo: validatedResponse.statusInfo,
        });
        await this.commandsClientApi.postCommandResult(
          tenantPartner.countryCode!,
          tenantPartner.partyId!,
          tenantPartner.tenant!.countryCode!,
          tenantPartner.tenant!.partyId!,
          tenantPartner.partnerProfileOCPI!,
          responseUrl,
          {
            result: CommandResultType.REJECTED,
            message: {
              language: 'en',
              text: 'Charging station unknown connector',
            },
          },
          commandId,
        );
        return;
      case OCPP2_0_1.UnlockStatusEnumType.UnlockFailed:
        this.logger.warn(`Unlock connector failed`, {
          statusInfo: validatedResponse.statusInfo,
        });
        await this.commandsClientApi.postCommandResult(
          tenantPartner.countryCode!,
          tenantPartner.partyId!,
          tenantPartner.tenant!.countryCode!,
          tenantPartner.tenant!.partyId!,
          tenantPartner.partnerProfileOCPI!,
          responseUrl,
          {
            result: CommandResultType.FAILED,
            message: {
              language: 'en',
              text: 'Charging station unlock connector failed',
            },
          },
          commandId,
        );
    }
  }
}
