import { Service } from 'typedi';
import { OcpiLocation, OcpiLocationProps } from '../model/OcpiLocation';
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
    cpoCountryCode?: string,
    cpoPartyId?: string,
  ): Promise<OcpiLocation[]> {
    return await this.readAllByQuery({
      ...this.createQuery(dateFrom, dateTo, cpoCountryCode, cpoPartyId),
      limit,
      offset,
    });
  }

  async getLocationsCount(dateFrom?: Date, dateTo?: Date): Promise<number> {
    return await this.existByQuery({
      ...this.createQuery(dateFrom, dateTo),
    });
  }

  async getLocationByCitrineLocationId(
    id: number,
  ): Promise<OcpiLocation | undefined> {
    return await this.readOnlyOneByQuery({
      where: {
        [OcpiLocationProps.citrineLocationId]: id,
      },
    });
  }

  async updateOcpiLocation(
    location: OcpiLocation,
  ): Promise<OcpiLocation | undefined> {
    const existingOcpiLocation = await this.getLocationByCitrineLocationId(
      location[OcpiLocationProps.citrineLocationId],
    );

    if (!existingOcpiLocation) {
      return undefined;
    }

    const updatedOcpiLocation = await this._updateByKey(
      {
        [OcpiLocationProps.lastUpdated]:
          location[OcpiLocationProps.lastUpdated],
      },
      String(existingOcpiLocation.id),
    );

    return updatedOcpiLocation;
  }

  private createQuery(
    dateFrom?: Date,
    dateTo?: Date,
    cpoCountryCode?: string,
    cpoPartyId?: string,
  ) {
    if (!dateFrom && !dateTo && !cpoCountryCode && !cpoPartyId) {
      return {};
    }

    const query: any = { where: { lastUpdated: {} } };

    if (dateFrom) {
      query.where[OcpiLocationProps.lastUpdated][Op.gte] = dateFrom;
    }

    if (dateTo) {
      query.where[OcpiLocationProps.lastUpdated][Op.lt] = dateTo;
    }

    if (cpoCountryCode && cpoPartyId) {
      query.where[OcpiLocationProps.countryCode] = cpoCountryCode;
      query.where[OcpiLocationProps.partyId] = cpoPartyId;
    }

    return query;
  }
}
