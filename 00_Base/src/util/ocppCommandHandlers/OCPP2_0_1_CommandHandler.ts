import {
  ChargingStationSequenceType,
  IChargingStationDto,
  ITenantPartnerDto,
  OCPP2_0_1,
  OCPPVersion,
} from '@citrineos/base';
import { IRequestOptions } from 'typed-rest-client';
import { Service } from 'typedi';
import { OCPP_COMMAND_HANDLER, OCPPCommandHandler } from '.';
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
import { CommandResultType } from '../..';

@Service({ id: OCPP_COMMAND_HANDLER, multiple: true })
export class OCP2_0_1_CommandHandler extends OCPPCommandHandler {
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
      `/2.2.1/commands/callback/${OCPPVersion.OCPP2_0_1}/RequestStartTransaction/${commandId}`;
    options.queryParameters = queryParameters;

    const sequenceResponse = await this.ocpiGraphqlClient.request<
      GetSequenceQueryResult,
      GetSequenceQueryVariables
    >(GET_SEQUENCE, {
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
      stationId: chargingStation.id,
      type: ChargingStationSequenceType.remoteStartId,
      value: remoteStartId,
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
      this.config.commands.ocpp2_0_1.requestStartTransactionUrl,
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
    throw new Error('Method not implemented.');
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
}
