import { Service } from 'typedi';
import { CancelReservation } from '../model/CancelReservation';
import { ReserveNow } from '../model/ReserveNow';
import { StartSession } from '../model/StartSession';
import { StopSession } from '../model/StopSession';
import { UnlockConnector } from '../model/UnlockConnector';
import { CommandType } from '../model/CommandType';
import { CommandResponse, CommandResponseType } from '../model/CommandResponse';
import { CommandExecutor } from '../util/command.executor';
import { OcpiResponse } from '../model/ocpi.response';
import { NotFoundException } from '../exception/NotFoundException';
import {
  buildGenericClientErrorResponse,
  buildGenericServerErrorResponse,
  buildGenericSuccessResponse,
  buildUnknownLocationResponse,
  buildUnknownSessionResponse,
} from '../util/response.generator';

@Service()
export class CommandsService {
  readonly TIMEOUT = 30;
  constructor(private commandExecutor: CommandExecutor) {}

  async postCommand(
    commandType: CommandType,
    payload:
      | CancelReservation
      | ReserveNow
      | StartSession
      | StopSession
      | UnlockConnector,
  ): Promise<OcpiResponse<CommandResponse>> {
    switch (commandType) {
      case CommandType.CANCEL_RESERVATION:
        return this.handleCancelReservation(payload as CancelReservation);
      case CommandType.RESERVE_NOW:
        return this.handleReserveNow(payload as ReserveNow);
      case CommandType.START_SESSION:
        return this.handleStartSession(payload as StartSession);
      case CommandType.STOP_SESSION:
        return this.handleStopSession(payload as StopSession);
      case CommandType.UNLOCK_CONNECTOR:
        return this.handleUnlockConnector(payload as UnlockConnector);
      default:
        return buildGenericClientErrorResponse(
          {
            result: CommandResponseType.NOT_SUPPORTED,
            timeout: this.TIMEOUT,
          },
          'Unknown command type: ' + commandType,
          undefined,
        );
    }
  }

  private handleCancelReservation(
    cancelReservation: CancelReservation,
  ): OcpiResponse<CommandResponse> {
    return buildGenericClientErrorResponse({
      result: CommandResponseType.NOT_SUPPORTED,
      timeout: this.TIMEOUT,
    });
  }

  private handleReserveNow(
    reserveNow: ReserveNow,
  ): OcpiResponse<CommandResponse> {
    return buildGenericClientErrorResponse({
      result: CommandResponseType.NOT_SUPPORTED,
      timeout: this.TIMEOUT,
    });
  }

  private async handleStartSession(
    startSession: StartSession,
  ): Promise<OcpiResponse<CommandResponse>> {
    const commandResponse = new OcpiResponse<CommandResponse>();

    try {
      await this.commandExecutor.executeStartSession(startSession);
      return buildGenericSuccessResponse({
        result: CommandResponseType.ACCEPTED,
        timeout: this.TIMEOUT,
      });
    } catch (e) {
      if (e instanceof NotFoundException) {
        return buildUnknownLocationResponse(
          {
            result: CommandResponseType.REJECTED,
            timeout: this.TIMEOUT,
          },
          undefined,
          e as NotFoundException,
        );
      } else {
        console.error(e);
        return buildGenericServerErrorResponse(
          {
            result: CommandResponseType.REJECTED,
            timeout: this.TIMEOUT,
          },
          undefined,
          e as Error,
        );
      }
    }
  }

  private async handleStopSession(
    stopSession: StopSession,
  ): Promise<OcpiResponse<CommandResponse>> {
    const commandResponse = new OcpiResponse<CommandResponse>();

    try {
      await this.commandExecutor.executeStopSession(stopSession);
      return buildGenericSuccessResponse({
        result: CommandResponseType.ACCEPTED,
        timeout: this.TIMEOUT,
      });
    } catch (e) {
      if (e instanceof NotFoundException) {
        return buildUnknownSessionResponse(
          {
            result: CommandResponseType.UNKNOWN_SESSION,
            timeout: this.TIMEOUT,
          },
          undefined,
          e as NotFoundException,
        );
      } else {
        console.error(e);
        return buildGenericServerErrorResponse(
          {} as CommandResponse,
          undefined,
          e as Error,
        );
      }
    }
  }

  private handleUnlockConnector(
    unlockConnector: UnlockConnector,
  ): OcpiResponse<CommandResponse> {
    return buildGenericClientErrorResponse({
      result: CommandResponseType.NOT_SUPPORTED,
      timeout: this.TIMEOUT,
    });
  }
}
