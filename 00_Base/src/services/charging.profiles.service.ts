import { Service } from 'typedi';
import { CommandExecutor } from '../util/command.executor';
import { OcpiResponse } from '../model/ocpi.response';
import {
  ChargingProfileResponse,
  ChargingProfileResultType,
} from '../model/ChargingProfileResponse';
import { NotFoundException } from '../exception/NotFoundException';
import { SetChargingProfile } from '../model/SetChargingProfile';
import { NotFoundError } from 'routing-controllers';
import { ResponseGenerator } from '../util/response.generator';

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
      return ResponseGenerator.buildGenericSuccessResponse({
        result: ChargingProfileResultType.ACCEPTED,
        timeout: this.TIMEOUT,
      });
    } catch (e: any) {
      if (e instanceof NotFoundError) {
        return ResponseGenerator.buildUnknownSessionResponse(
          {
            result: ChargingProfileResultType.UNKNOWN_SESSION,
            timeout: this.TIMEOUT,
          },
          e as NotFoundException,
        );
      }
      return ResponseGenerator.buildGenericServerErrorResponse(
        {
          result: ChargingProfileResultType.REJECTED,
          timeout: this.TIMEOUT,
        },
        e.message,
        e,
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
      return ResponseGenerator.buildGenericSuccessResponse({
        result: ChargingProfileResultType.ACCEPTED,
        timeout: this.TIMEOUT,
      });
    } catch (e: any) {
      if (e instanceof NotFoundError) {
        return ResponseGenerator.buildUnknownSessionResponse(
          {
            result: ChargingProfileResultType.UNKNOWN_SESSION,
            timeout: this.TIMEOUT,
          },
          e as NotFoundException,
        );
      }
      return ResponseGenerator.buildGenericServerErrorResponse(
        {
          result: ChargingProfileResultType.REJECTED,
          timeout: this.TIMEOUT,
        },
        e.message,
        e,
      );
    }
  }

  async putChargingProfile(
    sessionId: string,
    setChargingProfile: SetChargingProfile,
  ): Promise<OcpiResponse<ChargingProfileResponse>> {
    try {
      await this.commandExecutor.executePutChargingProfile(
        sessionId,
        setChargingProfile,
      );
      return ResponseGenerator.buildGenericSuccessResponse({
        result: ChargingProfileResultType.ACCEPTED,
        timeout: this.TIMEOUT,
      });
    } catch (e: any) {
      if (e instanceof NotFoundError) {
        return ResponseGenerator.buildUnknownSessionResponse(
          {
            result: ChargingProfileResultType.UNKNOWN_SESSION,
            timeout: this.TIMEOUT,
          },
          e as NotFoundException,
        );
      }
      return ResponseGenerator.buildGenericServerErrorResponse(
        {
          result: ChargingProfileResultType.REJECTED,
          timeout: this.TIMEOUT,
        },
        e.message,
        e,
      );
    }
  }
}
