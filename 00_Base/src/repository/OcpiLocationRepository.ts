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
      location[OcpiLocationProps.coreLocationId],
    );

    if (!existingOcpiLocation) {
      return undefined;
    }

    return await this._updateByKey(
      {
        [OcpiLocationProps.lastUpdated]:
          location[OcpiLocationProps.lastUpdated],
      },
      String(existingOcpiLocation.id),
    );
  }

  async createOrUpdateOcpiLocation(
    location: Partial<OcpiLocation>,
  ): Promise<OcpiLocation | undefined> {
    if (location[OcpiLocationProps.coreLocationId]) {
      const [savedOcpiLocation, ocpiLocationCreated] =
        await this._readOrCreateByQuery({
          where: {
            [OcpiLocationProps.coreLocationId]:
              location[OcpiLocationProps.coreLocationId],
          },
          defaults: {
            [OcpiLocationProps.coreLocationId]:
              location[OcpiLocationProps.coreLocationId],
            [OcpiLocationProps.partyId]: location[OcpiLocationProps.partyId],
            [OcpiLocationProps.countryCode]:
              location[OcpiLocationProps.countryCode],
            [OcpiLocationProps.publish]: location[OcpiLocationProps.publish],
            [OcpiLocationProps.lastUpdated]:
              location[OcpiLocationProps.lastUpdated],
            [OcpiLocationProps.timeZone]: location[OcpiLocationProps.timeZone],
          },
        });
      if (!ocpiLocationCreated) {
        const values: Partial<OcpiLocation> = {};
        values[OcpiLocationProps.coreLocationId] =
          location[OcpiLocationProps.coreLocationId] ?? undefined;
        values[OcpiLocationProps.partyId] =
          location[OcpiLocationProps.partyId] ?? undefined;
        values[OcpiLocationProps.countryCode] =
          location[OcpiLocationProps.countryCode] ?? undefined;
        values[OcpiLocationProps.publish] =
          location[OcpiLocationProps.publish] !== undefined
            ? location[OcpiLocationProps.publish]
            : undefined;
        values[OcpiLocationProps.lastUpdated] =
          location[OcpiLocationProps.lastUpdated] ?? undefined;
        values[OcpiLocationProps.timeZone] =
          location[OcpiLocationProps.timeZone] ?? undefined;

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
    if (!dateFrom && !dateTo && !cpoCountryCode && !cpoPartyId) {
      return {};
    }

    const query: any = { where: {} };

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
