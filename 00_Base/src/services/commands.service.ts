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
import { NotFoundError } from 'routing-controllers';
import { ResponseGenerator } from '../util/response.generator';
import { OcpiHeaders } from '../model/OcpiHeaders';
import { VersionNumber } from '../model/VersionNumber';

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
    ocpiHeaders: OcpiHeaders,
    versionNumber: VersionNumber,
  ): Promise<OcpiResponse<CommandResponse>> {
    switch (commandType) {
      case CommandType.CANCEL_RESERVATION:
        return this.handleCancelReservation(payload as CancelReservation);
      case CommandType.RESERVE_NOW:
        return this.handleReserveNow(payload as ReserveNow);
      case CommandType.START_SESSION:
        return this.handleStartSession(payload as StartSession, ocpiHeaders, versionNumber);
      case CommandType.STOP_SESSION:
        return this.handleStopSession(payload as StopSession);
      case CommandType.UNLOCK_CONNECTOR:
        return this.handleUnlockConnector(payload as UnlockConnector);
      default:
        return ResponseGenerator.buildGenericClientErrorResponse(
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
    _cancelReservation: CancelReservation,
  ): OcpiResponse<CommandResponse> {
    return ResponseGenerator.buildGenericClientErrorResponse({
      result: CommandResponseType.NOT_SUPPORTED,
      timeout: this.TIMEOUT,
    });
  }

  private handleReserveNow(
    _reserveNow: ReserveNow,
  ): OcpiResponse<CommandResponse> {
    return ResponseGenerator.buildGenericClientErrorResponse({
      result: CommandResponseType.NOT_SUPPORTED,
      timeout: this.TIMEOUT,
    });
  }

  private async handleStartSession(
    startSession: StartSession,
    ocpiHeaders: OcpiHeaders,
    versionNumber: VersionNumber,
  ): Promise<OcpiResponse<CommandResponse>> {
    try {
      await this.commandExecutor.executeStartSession(startSession, ocpiHeaders, versionNumber);
      return ResponseGenerator.buildGenericSuccessResponse({
        result: CommandResponseType.ACCEPTED,
        timeout: this.TIMEOUT,
      });
    } catch (e) {
      if (e instanceof NotFoundError) {
        return ResponseGenerator.buildUnknownLocationResponse(
          {
            result: CommandResponseType.REJECTED,
            timeout: this.TIMEOUT,
          },
          undefined,
          e as NotFoundError,
        );
      } else {
        console.error(e);
        return ResponseGenerator.buildGenericServerErrorResponse(
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
    try {
      await this.commandExecutor.executeStopSession(stopSession);
      return ResponseGenerator.buildGenericSuccessResponse({
        result: CommandResponseType.ACCEPTED,
        timeout: this.TIMEOUT,
      });
    } catch (e) {
      if (e instanceof NotFoundError) {
        return ResponseGenerator.buildGenericClientErrorResponse(
          {
            result: CommandResponseType.UNKNOWN_SESSION,
            timeout: this.TIMEOUT,
          },
          undefined,
          e as NotFoundError,
        );
      } else {
        console.error(e);
        return ResponseGenerator.buildGenericServerErrorResponse(
          {} as CommandResponse,
          undefined,
          e as Error,
        );
      }
    }
  }

  private handleUnlockConnector(
    _unlockConnector: UnlockConnector,
  ): OcpiResponse<CommandResponse> {
    return ResponseGenerator.buildGenericClientErrorResponse({
      result: CommandResponseType.NOT_SUPPORTED,
      timeout: this.TIMEOUT,
    });
  }
}
