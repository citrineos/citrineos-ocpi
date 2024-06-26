import { Service } from 'typedi';
import { OcpiConnector } from '../model/Connector';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { ILogObj, Logger } from 'tslog';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { SystemConfig } from '@citrineos/base';

/**
 * Repository for OCPI Connector
 */
@Service()
export class OcpiConnectorRepository extends SequelizeRepository<OcpiConnector> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.Connectors,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  async createOrUpdateOcpiConnector(
    connector: OcpiConnector
  ) {
    const [savedOcpiConnector, ocpiConnectorCreated] = await this._readOrCreateByQuery({
      where: {
        connectorId: connector.connectorId,
        evseId: connector.evseId,
        stationId: connector.stationId,
      },
      defaults: { ...connector }
    });
    if (!ocpiConnectorCreated) {
      await this._updateByKey({ ...connector }, savedOcpiConnector.id);
    }
  }
}
