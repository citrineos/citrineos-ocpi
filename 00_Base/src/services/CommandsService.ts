import { Inject, Service } from 'typedi';
import { CancelReservation } from '../model/CancelReservation';
import { ReserveNow } from '../model/ReserveNow';
import { StartSession } from '../model/StartSession';
import { StopSession } from '../model/StopSession';
import { UnlockConnector } from '../model/UnlockConnector';
import { CommandType } from '../model/CommandType';
import {
  CommandResponse,
  CommandResponseType,
  OcpiCommandResponse,
} from '../model/CommandResponse';
// import { CommandExecutor } from '../util/CommandExecutor';
import { BadRequestError, NotFoundError } from 'routing-controllers';
import { ResponseGenerator } from '../util/response.generator';
import { CommandExecutor } from '../util/CommandExecutor';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { ILogObj, Logger } from 'tslog';
import { OcpiConfig, OcpiConfigToken } from '../config/ocpi.types';
import { IChargingStationDto, ITenantPartnerDto } from '@citrineos/base';
import {
  GetChargingStationByIdQueryResult,
  GetChargingStationByIdQueryVariables,
  GetTransactionByIdQueryResult,
  GetTransactionByIdQueryVariables,
  GetTransactionByTransactionIdQueryResult,
  GetTransactionByTransactionIdQueryVariables,
} from '../graphql/operations';
import { GET_CHARGING_STATION_BY_ID_QUERY } from '../graphql/queries/chargingStation.queries';
import { EXTRACT_STATION_ID } from '../model/DTO/EvseDTO';
import {
  GET_TRANSACTION_BY_ID_QUERY,
  GET_TRANSACTION_BY_TRANSACTION_ID_QUERY,
} from '../graphql/queries/transaction.queries';

@Service()
export class CommandsService {
  @Inject()
  protected logger!: Logger<ILogObj>;

  @Inject()
  protected ocpiGraphqlClient!: OcpiGraphqlClient;

  @Inject()
  protected commandExecutor!: CommandExecutor;

  @Inject(OcpiConfigToken) readonly config!: OcpiConfig;

  public async postCommand(
    commandType: CommandType,
    payload:
      | CancelReservation
      | ReserveNow
      | StartSession
      | StopSession
      | UnlockConnector,
    tenantPartner: ITenantPartnerDto,
  ): Promise<OcpiCommandResponse> {
    switch (commandType) {
      case CommandType.CANCEL_RESERVATION:
        return this.handleCancelReservation(
          payload as CancelReservation,
          tenantPartner,
        );
      case CommandType.RESERVE_NOW:
        return this.handleReserveNow(payload as ReserveNow, tenantPartner);
      case CommandType.START_SESSION:
        return this.handleStartSession(payload as StartSession, tenantPartner);
      case CommandType.STOP_SESSION:
        return this.handleStopSession(payload as StopSession);
      case CommandType.UNLOCK_CONNECTOR:
        return this.handleUnlockConnector(payload as UnlockConnector);
      default:
        return ResponseGenerator.buildGenericClientErrorResponse(
          {
            result: CommandResponseType.NOT_SUPPORTED,
            timeout: this.config.commands.timeout,
          },
          'Unknown command type: ' + commandType,
          undefined,
        );
    }
  }

  private async handleCancelReservation(
    cancelReservation: CancelReservation,
    tenantPartner: ITenantPartnerDto,
  ): Promise<OcpiCommandResponse> {
    try {
      this.commandExecutor.executeCancelReservation(
        cancelReservation,
        fromCountryCode,
        fromPartyId,
      );
      return ResponseGenerator.buildGenericSuccessResponse({
        result: CommandResponseType.ACCEPTED,
        timeout: this.config.commands.timeout,
      });
    } catch (e) {
      if (e instanceof NotFoundError) {
        return ResponseGenerator.buildGenericClientErrorResponse(
          {
            result: CommandResponseType.REJECTED,
            timeout: this.config.commands.timeout,
          },
          e.message,
          e as NotFoundError,
        );
      } else {
        console.error(e);
        return ResponseGenerator.buildGenericServerErrorResponse(
          {
            result: CommandResponseType.REJECTED,
            timeout: this.config.commands.timeout,
          },
          undefined,
          e as Error,
        );
      }
    }
  }

  private async handleReserveNow(
    reserveNow: ReserveNow,
    tenantPartner: ITenantPartnerDto,
  ): Promise<OcpiCommandResponse> {
    try {
      // await this.commandExecutor.executeReserveNow(
      //   reserveNow,
      //   fromCountryCode,
      //   fromPartyId,
      // );
      return ResponseGenerator.buildGenericSuccessResponse({
        result: CommandResponseType.ACCEPTED,
        timeout: this.config.commands.timeout,
      });
    } catch (e) {
      if (e instanceof NotFoundError) {
        return ResponseGenerator.buildGenericClientErrorResponse(
          {
            result: CommandResponseType.REJECTED,
            timeout: this.config.commands.timeout,
          },
          e.message,
          e as NotFoundError,
        );
      } else if (e instanceof BadRequestError) {
        return ResponseGenerator.buildInvalidOrMissingParametersResponse(
          {
            result: CommandResponseType.REJECTED,
            timeout: this.config.commands.timeout,
          },
          e.message,
          e as BadRequestError,
        );
      } else {
        console.error(e);
        return ResponseGenerator.buildGenericServerErrorResponse(
          {
            result: CommandResponseType.REJECTED,
            timeout: this.config.commands.timeout,
          },
          undefined,
          e as Error,
        );
      }
    }
  }

  private async handleStartSession(
    startSession: StartSession,
    tenantPartner: ITenantPartnerDto,
  ): Promise<OcpiCommandResponse> {
    if (!startSession.evse_uid) {
      this.logger.error('EVSE UID is required for StartSession command');
      return ResponseGenerator.buildInvalidOrMissingParametersResponse(
        {
          result: CommandResponseType.REJECTED,
          timeout: this.config.commands.timeout,
        },
        'EVSE UID required by this CPO',
      );
    }
    if (
      tenantPartner.countryCode !== startSession.token.country_code ||
      tenantPartner.partyId !== startSession.token.party_id
    ) {
      this.logger.error('Token information does not match credentials');
      return ResponseGenerator.buildInvalidOrMissingParametersResponse(
        {
          result: CommandResponseType.REJECTED,
          timeout: this.config.commands.timeout,
        },
        'Token information does not match credentials',
      );
    }
    const chargingStationResponse = await this.ocpiGraphqlClient.request<
      GetChargingStationByIdQueryResult,
      GetChargingStationByIdQueryVariables
    >(GET_CHARGING_STATION_BY_ID_QUERY, {
      id: EXTRACT_STATION_ID(startSession.evse_uid!),
    });
    if (
      !chargingStationResponse.ChargingStations[0] ||
      chargingStationResponse.ChargingStations[0].locationId?.toString() !==
        startSession.location_id
    ) {
      this.logger.error('Charging station not found for evse_uid', {
        evseUid: startSession.evse_uid,
      });
      return ResponseGenerator.buildInvalidOrMissingParametersResponse(
        {
          result: CommandResponseType.REJECTED,
          timeout: this.config.commands.timeout,
        },
        'Unknown charging station',
      );
    }
    const chargingStation = chargingStationResponse
      .ChargingStations[0] as IChargingStationDto;
    if (!chargingStation.isOnline) {
      this.logger.error('Charging station is offline', {
        stationId: chargingStation.id,
      });
      return ResponseGenerator.buildInvalidOrMissingParametersResponse(
        {
          result: CommandResponseType.REJECTED,
          timeout: this.config.commands.timeout,
        },
        'Charging station is offline',
      );
    }
    if (
      startSession.connector_id &&
      !Array.from(chargingStation.connectors || []).some(
        (value) => value.id?.toString() === startSession.connector_id,
      )
    ) {
      this.logger.error('Connector not found for StartSession command', {
        stationId: chargingStation.id,
        connectorId: startSession.connector_id,
      });
      return ResponseGenerator.buildInvalidOrMissingParametersResponse(
        {
          result: CommandResponseType.REJECTED,
          timeout: this.config.commands.timeout,
        },
        'Unknown connector',
      );
    }
    this.commandExecutor.executeStartSession(
      startSession,
      tenantPartner,
      chargingStation,
    );
    return ResponseGenerator.buildGenericSuccessResponse({
      result: CommandResponseType.ACCEPTED,
      timeout: this.config.commands.timeout,
    });
  }

  private async handleStopSession(
    stopSession: StopSession,
    tenantPartner: ITenantPartnerDto,
  ): Promise<OcpiCommandResponse> {
    const transactionResponse = await this.ocpiGraphqlClient.request<
      GetTransactionByTransactionIdQueryResult,
      GetTransactionByTransactionIdQueryVariables
    >(GET_TRANSACTION_BY_TRANSACTION_ID_QUERY, {
      transactionId: stopSession.session_id,
    });
    if (!transactionResponse.Transactions[0]) {
      this.logger.error('Unknown transaction', {
        transactionId: stopSession.session_id,
      });
      return ResponseGenerator.buildInvalidOrMissingParametersResponse(
        {
          result: CommandResponseType.UNKNOWN_SESSION,
          timeout: this.config.commands.timeout,
        },
        'Session not found',
      );
    }
    const transaction = transactionResponse.Transactions[0];
    if (
      tenantPartner.countryCode !==
        transaction.authorization!.tenantPartner!.countryCode! ||
      tenantPartner.partyId !==
        transaction.authorization!.tenantPartner!.partyId!
    ) {
      this.logger.error('Token information does not match credentials');
      return ResponseGenerator.buildInvalidOrMissingParametersResponse(
        {
          result: CommandResponseType.REJECTED,
          timeout: this.config.commands.timeout,
        },
        'Token information does not match credentials',
      );
    }
    if (!transaction.isActive) {
      this.logger.error('Stop session transaction is not active', {
        transactionId: transaction.id,
      });
      return ResponseGenerator.buildInvalidOrMissingParametersResponse(
        {
          result: CommandResponseType.REJECTED,
          timeout: this.config.commands.timeout,
        },
        'Session is already stopped',
      );
    }
    const chargingStation = transaction.chargingStation as IChargingStationDto;
    if (!chargingStation.isOnline) {
      this.logger.error('Charging station is offline', {
        stationId: chargingStation.id,
      });
      return ResponseGenerator.buildInvalidOrMissingParametersResponse(
        {
          result: CommandResponseType.REJECTED,
          timeout: this.config.commands.timeout,
        },
        'Charging station is offline',
      );
    }
    this.commandExecutor.executeStopSession(
      stopSession,
      tenantPartner,
      chargingStation,
    );
    return ResponseGenerator.buildGenericSuccessResponse({
      result: CommandResponseType.ACCEPTED,
      timeout: this.config.commands.timeout,
    });
  }

  private handleUnlockConnector(
    _unlockConnector: UnlockConnector,
  ): OcpiCommandResponse {
    return ResponseGenerator.buildGenericClientErrorResponse({
      result: CommandResponseType.NOT_SUPPORTED,
      timeout: this.config.commands.timeout,
    });
  }
}
