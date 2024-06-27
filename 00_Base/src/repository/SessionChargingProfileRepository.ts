import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { SystemConfig} from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import {SessionChargingProfile} from "../model/SessionChargingProfile";

@Service()
export class SessionChargingProfileRepository extends SequelizeRepository<SessionChargingProfile> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      'SessionChargingProfile',
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  public async createOrUpdateSessionChargingProfile (
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
      })
      if (created) {
          return sessionChargingProfile;
      } else {
          return await sessionChargingProfile.update({chargingProfileId: chargingProfileId, chargingScheduleId: chargingScheduleId});
      }
  }
}
