import { Service } from 'typedi';
import { OcpiEvse } from '../model/Evse';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { ILogObj, Logger } from 'tslog';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { SystemConfig } from '@citrineos/base'

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
      OcpiNamespace.Evses,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  async createOrUpdateOcpiEvse(
    evse: OcpiEvse
  ) {
    // TODO find evse by stationId/evseId
  }
}
