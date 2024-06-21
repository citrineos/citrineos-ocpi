import {SetChargingProfile} from "../model/SetChargingProfile";
import {Service} from 'typedi';
import {CommandExecutor} from '../util/CommandExecutor';
import {OcpiResponse} from '../model/ocpi.response';
import {ChargingProfileResponse, ChargingProfileResponseType} from '../model/ChargingProfileResponse';
import {NotFoundException} from "../exception/not.found.exception";
import {
    buildGenericServerErrorResponse,
    buildGenericSuccessResponse,
    buildUnknownSessionResponse
} from "../util/ResponseGenerator";

@Service()
export class ChargingProfilesService {
  readonly TIMEOUT = 30;

  constructor(private commandExecutor: CommandExecutor) {}

    async getActiveChargingProfile(
        sessionId: string,
        duration: number,
        responseUrl: string,
    ): Promise<OcpiResponse<ChargingProfileResponse>> {
        this.commandExecutor.executeGetActiveChargingProfile(
            sessionId,
            duration,
            responseUrl,
        );
        return new OcpiResponse<ChargingProfileResponse>();
    }

    async putChargingProfile(sessionId: string, setChargingProfile: SetChargingProfile): Promise<OcpiResponse<ChargingProfileResponse>> {
      try {
          await this.commandExecutor.executePutChargingProfile(sessionId, setChargingProfile);
          return buildGenericSuccessResponse({
              result: ChargingProfileResponseType.ACCEPTED,
              timeout: this.TIMEOUT
          });
      } catch (e) {
          if (e instanceof NotFoundException) {
              return buildUnknownSessionResponse({
                  result: ChargingProfileResponseType.UNKNOWN_SESSION,
                  timeout: this.TIMEOUT
              }, e as NotFoundException);
          } else {
              return buildGenericServerErrorResponse({} as ChargingProfileResponse, e as Error);
          }
      }
    }
}
