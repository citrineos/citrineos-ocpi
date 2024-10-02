import { Service } from 'typedi';
import { OcpiLocation, OcpiLocationProps } from '../model/OcpiLocation';
import { SequelizeRepository } from '@citrineos/data';
import { ILogObj, Logger } from 'tslog';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { SystemConfig } from '@citrineos/base';
import { Op } from 'sequelize';
import { ServerConfig } from '../config/ServerConfig';

/**
 * Repository for OCPI Location
 */
@Service()
export class OcpiLocationRepository extends SequelizeRepository<OcpiLocation> {
  constructor(
    systemConfig: ServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      systemConfig as SystemConfig,
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
      order: [['createdAt', 'ASC']],
      limit,
      offset,
    });
  }

  async getLocationsCount(
    dateFrom?: Date,
    dateTo?: Date,
    cpoCountryCode?: string,
    cpoPartyId?: string,
  ): Promise<number> {
    return await this.existByQuery({
      ...this.createQuery(dateFrom, dateTo, cpoCountryCode, cpoPartyId),
    });
  }

  async getLocationByCoreLocationId(
    id: number,
  ): Promise<OcpiLocation | undefined> {
    return await this.readOnlyOneByQuery({
      where: {
        [OcpiLocationProps.coreLocationId]: id,
      },
    });
  }

  async updateOcpiLocation(
    location: OcpiLocation,
  ): Promise<OcpiLocation | undefined> {
    const existingOcpiLocation = await this.getLocationByCoreLocationId(
      location.coreLocationId,
    );

    if (!existingOcpiLocation) {
      return undefined;
    }

    return await this._updateByKey(
      {
        [OcpiLocationProps.lastUpdated]: location.lastUpdated,
      },
      String(existingOcpiLocation.id),
    );
  }

  async createOrUpdateOcpiLocation(
    location: OcpiLocation | Partial<OcpiLocation>,
  ): Promise<OcpiLocation | undefined> {
    if (location.coreLocationId) {
      const [savedOcpiLocation, ocpiLocationCreated] =
        await this._readOrCreateByQuery({
          where: {
            [OcpiLocationProps.coreLocationId]: location.coreLocationId,
          },
          defaults: {
            [OcpiLocationProps.coreLocationId]: location.coreLocationId,
            [OcpiLocationProps.partyId]: location.partyId,
            [OcpiLocationProps.countryCode]: location.countryCode,
            [OcpiLocationProps.publish]: location.publish,
            [OcpiLocationProps.lastUpdated]: location.lastUpdated,
            [OcpiLocationProps.timeZone]: location.timeZone,
          },
        });
      if (!ocpiLocationCreated) {
        const values: Partial<OcpiLocation> = {};
        values.coreLocationId = location.coreLocationId ?? undefined;
        values.partyId = location.partyId ?? undefined;
        values.countryCode = location.countryCode ?? undefined;
        values.publish =
          location.publish !== undefined ? location.publish : undefined;
        values.lastUpdated = location.lastUpdated ?? undefined;
        values.timeZone = location.timeZone ?? undefined;

        return await this._updateByKey({ ...values }, savedOcpiLocation.id);
      } else {
        return savedOcpiLocation;
      }
    } else {
      return await this.create(OcpiLocation.build({ ...location }));
    }
  }

  private createQuery(
    dateFrom?: Date,
    dateTo?: Date,
    cpoCountryCode?: string,
    cpoPartyId?: string,
  ) {
    const query: any = {
      where: {
        [OcpiLocationProps.coreLocationId]: {
          [Op.not]: null,
        },
      },
    };

    if (!dateFrom && !dateTo && !cpoCountryCode && !cpoPartyId) {
      return query;
    }

    if (dateFrom) {
      query.where[OcpiLocationProps.lastUpdated] =
        query.where[OcpiLocationProps.lastUpdated] ?? {};
      query.where[OcpiLocationProps.lastUpdated][Op.gte] = dateFrom;
    }

    if (dateTo) {
      query.where[OcpiLocationProps.lastUpdated] =
        query.where[OcpiLocationProps.lastUpdated] ?? {};
      query.where[OcpiLocationProps.lastUpdated][Op.lt] = dateTo;
    }

    if (cpoCountryCode && cpoPartyId) {
      query.where[OcpiLocationProps.countryCode] = cpoCountryCode;
      query.where[OcpiLocationProps.partyId] = cpoPartyId;
    }

    return query;
  }
}
