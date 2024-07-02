import { Service } from 'typedi';
import { OcpiLocation } from '../model/OcpiLocation';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { ILogObj, Logger } from 'tslog';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { SystemConfig } from '@citrineos/base';
import { Op } from 'sequelize';

/**
 * Repository for OCPI Location
 */
@Service()
export class OcpiLocationRepository extends SequelizeRepository<OcpiLocation> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.OcpiLocation,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  async getLocations(
    limit: number,
    offset: number,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<OcpiLocation[]> {
    return await this.readAllByQuery({
      ...this.createDateQuery(dateFrom, dateTo),
      limit,
      offset,
    });
  }

  async getLocationsCount(dateFrom?: Date, dateTo?: Date): Promise<number> {
    return await this.existByQuery({
      ...this.createDateQuery(dateFrom, dateTo),
    });
  }

  async createOrUpdateOcpiLocation(location: OcpiLocation) {
    const [savedOcpiLocation, ocpiLocationCreated] =
      await this._readOrCreateByQuery({
        where: {
          id: location.id,
        },
        defaults: {
          id: location.id,
          lastUpdated: location.lastUpdated,
        },
      });
    if (!ocpiLocationCreated) {
      await this._updateByKey(
        {
          lastUpdated: location.lastUpdated,
        },
        savedOcpiLocation.id,
      );
    }
  }

  private createDateQuery(dateFrom?: Date, dateTo?: Date) {
    if (!dateFrom && !dateTo) {
      return {};
    }

    const query: any = { where: { lastUpdated: {} } };

    if (dateFrom) {
      query.where.lastUpdated[Op.gte] = dateFrom;
    }

    if (dateTo) {
      query.where.lastUpdated[Op.lt] = dateTo;
    }

    return query;
  }
}
