import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { SystemConfig } from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { SessionChargingProfile } from '../model/SessionChargingProfile';
import { ServerConfig } from '../config/ServerConfig';

@Service()
export class SessionChargingProfileRepository extends SequelizeRepository<SessionChargingProfile> {
  constructor(
    systemConfig: ServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      systemConfig as SystemConfig,
      'SessionChargingProfile',
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  public async createOrUpdateSessionChargingProfile(
    sessionId: string,
    chargingProfileId: number,
    chargingScheduleId: number,
  ): Promise<SessionChargingProfile> {
    const [sessionChargingProfile, created] = await this._readOrCreateByQuery({
      where: {
        sessionId: sessionId,
      },
      defaults: {
        chargingProfileId: chargingProfileId,
        chargingScheduleId: chargingScheduleId,
      },
    });
    if (created) {
      return sessionChargingProfile;
    } else {
      return await sessionChargingProfile.update({
        chargingProfileId: chargingProfileId,
        chargingScheduleId: chargingScheduleId,
      });
    }
  }
}
