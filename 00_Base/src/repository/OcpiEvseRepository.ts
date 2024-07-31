import { Service } from 'typedi';
import { OcpiEvse } from '../model/OcpiEvse';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { ILogObj, Logger } from 'tslog';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { SystemConfig } from '@citrineos/base';
import { EXTRACT_EVSE_ID, EXTRACT_STATION_ID } from '../model/DTO/EvseDTO';

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

  async getOcpiEvseByEvseUid(evseUid: string): Promise<OcpiEvse | undefined> {
    const evseId = EXTRACT_EVSE_ID(evseUid);
    const stationId = EXTRACT_STATION_ID(evseUid);

    return await this.readOnlyOneByQuery({
      where: {
        evseId,
        stationId,
      },
    });
  }

  async getEvseByEvseId(
    evseId: number,
    stationId: string,
  ): Promise<OcpiEvse | undefined> {
    return await this.readOnlyOneByQuery({
      where: {
        evseId,
        stationId,
      },
    });
  }

  async createOrUpdateOcpiEvse(
    evse: OcpiEvse | Partial<OcpiEvse>,
  ): Promise<void> {
    const [savedOcpiEvse, ocpiEvseCreated] = await this._readOrCreateByQuery({
      where: {
        evseId: evse.evseId,
        stationId: evse.stationId,
      },
      defaults: {
        evseId: evse.evseId,
        stationId: evse.stationId,
        lastUpdated: evse.lastUpdated,
        physicalReference: evse.physicalReference,
        removed: evse.removed,
      },
    });
    if (!ocpiEvseCreated) {
      const values: Partial<OcpiEvse> = {};
      values.physicalReference = evse.physicalReference ?? undefined;
      values.removed = evse.removed !== undefined ? evse.removed : undefined;
      values.lastUpdated = evse.lastUpdated ?? undefined;

      await this._updateByKey({ ...values }, savedOcpiEvse.id);
    }
  }
}
