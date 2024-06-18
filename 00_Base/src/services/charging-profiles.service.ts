import { Service } from 'typedi';
import { CommandExecutor } from '../util/CommandExecutor';
import { OcpiResponse } from '../model/ocpi.response';
import { ChargingProfileResponse } from '../model/ChargingProfileResponse';

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
}
