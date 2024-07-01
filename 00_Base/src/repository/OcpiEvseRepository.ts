import { Service } from 'typedi';
import { OcpiEvse } from '../model/Evse';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { ILogObj, Logger } from 'tslog';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { SystemConfig } from '@citrineos/base';

/**
 * Repository for OCPIEvse
 */
@Service()
export class OcpiEvseRepository extends SequelizeRepository<OcpiEvse> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.OcpiEvse,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  async createOrUpdateOcpiEvse(evse: OcpiEvse): Promise<void> {
    const [savedOcpiEvse, ocpiEvseCreated] = await this._readOrCreateByQuery({
      where: {
        evseId: evse.evseId,
        stationId: evse.stationId,
      },
      defaults: {
        evseId: evse.evseId,
        stationId: evse.stationId,
        lastUpdated: evse.lastUpdated,
      },
    });
    if (!ocpiEvseCreated) {
      await this._updateByKey(
        {
          physicalReference: evse.physicalReference,
          lastUpdated: evse.lastUpdated,
        },
        savedOcpiEvse.id,
      );
    }
  }
}
