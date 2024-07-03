import { Service } from 'typedi';
import { CommandExecutor } from '../util/command.executor';
import { OcpiResponse } from '../model/ocpi.response';
import {
  ChargingProfileResponse,
  ChargingProfileResultType,
} from '../model/ChargingProfileResponse';
import {
  buildGenericServerErrorResponse,
  buildGenericSuccessResponse,
  buildUnknownSessionResponse,
} from '../util/ResponseGenerator';
import { NotFoundException } from '../exception/NotFoundException';

@Service()
export class ChargingProfilesService {
  readonly TIMEOUT = 30;

  constructor(private commandExecutor: CommandExecutor) {}

  async getActiveChargingProfile(
    sessionId: string,
    duration: number,
    responseUrl: string,
  ): Promise<OcpiResponse<ChargingProfileResponse>> {
    try {
      await this.commandExecutor.executeGetActiveChargingProfile(
        sessionId,
        duration,
        responseUrl,
      );
      return buildGenericSuccessResponse({
        result: ChargingProfileResultType.ACCEPTED,
        timeout: this.TIMEOUT,
      });
    } catch (e) {
      if (e instanceof NotFoundException) {
        return buildUnknownSessionResponse(
          {
            result: ChargingProfileResultType.UNKNOWN_SESSION,
            timeout: this.TIMEOUT,
          },
          e as NotFoundException,
        );
      }
      return buildGenericServerErrorResponse(
        {
          result: ChargingProfileResultType.REJECTED,
          timeout: this.TIMEOUT,
        },
        e as Error,
      );
    }
  }

  async deleteChargingProfile(
    sessionId: string,
    responseUrl: string,
  ): Promise<OcpiResponse<ChargingProfileResponse>> {
    try {
      await this.commandExecutor.executeClearChargingProfile(
        sessionId,
        responseUrl,
      );
      return buildGenericSuccessResponse({
        result: ChargingProfileResultType.ACCEPTED,
        timeout: this.TIMEOUT,
      });
    } catch (e) {
      if (e instanceof NotFoundException) {
        return buildUnknownSessionResponse(
          {
            result: ChargingProfileResultType.UNKNOWN_SESSION,
            timeout: this.TIMEOUT,
          },
          e as NotFoundException,
        );
      }
      return buildGenericServerErrorResponse(
        {
          result: ChargingProfileResultType.REJECTED,
          timeout: this.TIMEOUT,
        },
        e as Error,
      );
    }
  }
}
