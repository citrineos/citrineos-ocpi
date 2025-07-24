import { Service } from 'typedi';
import { CancelReservation } from '../model/CancelReservation';
import { ReserveNow } from '../model/ReserveNow';
import { StartSession } from '../model/StartSession';
import { StopSession } from '../model/StopSession';
import { UnlockConnector } from '../model/UnlockConnector';
import { CommandType } from '../model/CommandType';
import { CommandResponse, CommandResponseType } from '../model/CommandResponse';
// import { CommandExecutor } from '../util/CommandExecutor';
import { OcpiResponse } from '../model/OcpiResponse';
import { BadRequestError, NotFoundError } from 'routing-controllers';
import { ResponseGenerator } from '../util/response.generator';

@Service()
export class CommandsService {
  readonly TIMEOUT = 30;

  // constructor(private commandExecutor: CommandExecutor) {}

  async postCommand(
    commandType: CommandType,
    payload:
      | CancelReservation
      | ReserveNow
      | StartSession
      | StopSession
      | UnlockConnector,
    fromCountryCode: string,
    fromPartyId: string,
  ): Promise<OcpiResponse<CommandResponse>> {
    switch (commandType) {
      case CommandType.CANCEL_RESERVATION:
        return this.handleCancelReservation(
          payload as CancelReservation,
          fromCountryCode,
          fromPartyId,
        );
      case CommandType.RESERVE_NOW:
        return this.handleReserveNow(
          payload as ReserveNow,
          fromCountryCode,
          fromPartyId,
        );
      case CommandType.START_SESSION:
        return this.handleStartSession(payload as StartSession);
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

  private async handleCancelReservation(
    cancelReservation: CancelReservation,
    fromCountryCode: string,
    fromPartyId: string,
  ): Promise<OcpiResponse<CommandResponse>> {
    try {
      // await this.commandExecutor.executeCancelReservation(
      //   cancelReservation,
      //   fromCountryCode,
      //   fromPartyId,
      // );
      return ResponseGenerator.buildGenericSuccessResponse({
        result: CommandResponseType.ACCEPTED,
        timeout: this.TIMEOUT,
      });
    } catch (e) {
      if (e instanceof NotFoundError) {
        return ResponseGenerator.buildGenericClientErrorResponse(
          {
            result: CommandResponseType.REJECTED,
            timeout: this.TIMEOUT,
          },
          e.message,
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

  private async handleReserveNow(
    reserveNow: ReserveNow,
    fromCountryCode: string,
    fromPartyId: string,
  ): Promise<OcpiResponse<CommandResponse>> {
    try {
      // await this.commandExecutor.executeReserveNow(
      //   reserveNow,
      //   fromCountryCode,
      //   fromPartyId,
      // );
      return ResponseGenerator.buildGenericSuccessResponse({
        result: CommandResponseType.ACCEPTED,
        timeout: this.TIMEOUT,
      });
    } catch (e) {
      if (e instanceof NotFoundError) {
        return ResponseGenerator.buildGenericClientErrorResponse(
          {
            result: CommandResponseType.REJECTED,
            timeout: this.TIMEOUT,
          },
          e.message,
          e as NotFoundError,
        );
      } else if (e instanceof BadRequestError) {
        return ResponseGenerator.buildInvalidOrMissingParametersResponse(
          {
            result: CommandResponseType.REJECTED,
            timeout: this.TIMEOUT,
          },
          e.message,
          e as BadRequestError,
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

  private async handleStartSession(
    startSession: StartSession,
  ): Promise<OcpiResponse<CommandResponse>> {
    try {
      // await this.commandExecutor.executeStartSession(startSession);
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
      // await this.commandExecutor.executeStopSession(stopSession);
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
