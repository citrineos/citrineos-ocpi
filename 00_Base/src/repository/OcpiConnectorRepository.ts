import { Service } from 'typedi';
import { OcpiConnector } from '../model/OcpiConnector';
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
      OcpiNamespace.OcpiConnector,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  async getConnectorByConnectorId(
    stationId: string,
    evseId: number,
    connectorId: number,
  ): Promise<OcpiConnector | undefined> {
    return await this.readOnlyOneByQuery({
      where: {
        stationId,
        evseId,
        connectorId,
      },
    });
  }

  async createOrUpdateOcpiConnector(connector: OcpiConnector): Promise<void> {
    const [savedOcpiConnector, ocpiConnectorCreated] =
      await this._readOrCreateByQuery({
        where: {
          connectorId: connector.connectorId,
          evseId: connector.evseId,
          stationId: connector.stationId,
        },
        defaults: {
          connectorId: connector.connectorId,
          evseId: connector.evseId,
          stationId: connector.stationId,
          lastUpdated: connector.lastUpdated,
        },
      });
    if (!ocpiConnectorCreated) {
      await this._updateByKey(
        {
          lastUpdated: connector.lastUpdated,
        },
        savedOcpiConnector.id,
      );
    }
  }
}
