import { Service } from 'typedi';
import { OcpiLocation, OcpiLocationProps } from '../model/OcpiLocation';
import { OcpiToken } from '../model/OcpiToken';
import { Op } from 'sequelize';
import {
  Authorization,
  ChargingStation,
  Evse,
  IdToken,
  Location,
  MeterValue,
  Model,
  TransactionEvent,
} from '@citrineos/data';

@Service()
export class TransactionQueryBuilder {
  private readonly MODELS = {
    CHARGING_STATION: 'ChargingStation',
    LOCATION: 'Location',
    OCPI_LOCATION: 'OcpiLocation',
    TRANSACTION_EVENT: 'TransactionEvent',
    ID_TOKEN: 'IdToken',
    AUTHORIZATION: 'Authorization',
    OCPI_TOKEN: 'OcpiToken',
  };

  buildQuery(params: QueryParams): any {
    const queryOptions: any = {
      where: {},
      include: this.getIncludeOptions(),
    };

    this.addDateFilters(queryOptions, params.dateFrom, params.dateTo);
    this.addMspFilters(queryOptions, params.mspCountryCode, params.mspPartyId);
    this.addCpoFilters(queryOptions, params.cpoCountryCode, params.cpoPartyId);
    this.addPagination(queryOptions, params.offset, params.limit);

    return queryOptions;
  }

  private getIncludeOptions(): any[] {
    return [
      {
        model: ChargingStation,
        required: true,
        duplicating: false,
        include: [
          {
            model: Location,
            required: true,
            duplicating: false,
            include: [
              {
                model: OcpiLocation,
                required: true,
                duplicating: false,
                where: {},
              },
            ],
          },
        ],
      },
      {
        model: TransactionEvent,
        required: true,
        duplicating: false,
        include: [
          {
            model: IdToken,
            required: true,
            duplicating: false,
            include: [
              {
                model: Authorization,
                required: true,
                duplicating: false,
                include: [
                  {
                    model: OcpiToken,
                    required: true,
                    duplicating: false,
                    where: {},
                  },
                ],
              },
            ],
          },
        ],
      },
      MeterValue,
      Evse,
    ];
  }

  private addDateFilters(
    queryOptions: any,
    dateFrom?: Date,
    dateTo?: Date,
  ): void {
    if (dateFrom || dateTo) {
      queryOptions.where.updatedAt = {};
      if (dateFrom) {
        queryOptions.where.updatedAt[Op.gte] = dateFrom;
      }
      if (dateTo) {
        queryOptions.where.updatedAt[Op.lt] = dateTo;
      }
    }
  }

  private addMspFilters(
    queryOptions: any,
    mspCountryCode?: string,
    mspPartyId?: string,
  ): void {
    const ocpiTokenInclude = this.getNestedInclude(
      queryOptions,
      TransactionEvent,
      IdToken,
      Authorization,
      OcpiToken,
    );

    if (ocpiTokenInclude) {
      ocpiTokenInclude.where = ocpiTokenInclude.where || {};
      if (mspCountryCode) {
        ocpiTokenInclude.where.country_code = mspCountryCode;
      }
      if (mspPartyId) {
        ocpiTokenInclude.where.party_id = mspPartyId;
      }
    }
  }

  private addCpoFilters(
    queryOptions: any,
    cpoCountryCode?: string,
    cpoPartyId?: string,
  ): void {
    const ocpiLocationInclude = this.getNestedInclude(
      queryOptions,
      ChargingStation,
      Location,
      OcpiLocation,
    );

    if (ocpiLocationInclude) {
      ocpiLocationInclude.where = ocpiLocationInclude.where || {};
      if (cpoCountryCode) {
        ocpiLocationInclude.where[OcpiLocationProps.countryCode] =
          cpoCountryCode;
      }
      if (cpoPartyId) {
        ocpiLocationInclude.where[OcpiLocationProps.partyId] = cpoPartyId;
      }
    }
  }

  private addPagination(
    queryOptions: any,
    offset?: number,
    limit?: number,
  ): void {
    if (offset) {
      queryOptions.offset = offset;
    }
    if (limit) {
      queryOptions.limit = limit;
    }
  }

  private findInclude(includes: any[], ModelClass: typeof Model): any {
    return includes.find((include) => include.model === ModelClass);
  }

  private getNestedInclude(
    queryOptions: any,
    ...ModelClasses: Array<typeof Model>
  ): any {
    let currentInclude = queryOptions.include;
    for (const ModelClass of ModelClasses) {
      const include = this.findInclude(currentInclude, ModelClass);
      if (!include) {
        return null;
      }
      currentInclude = include.include;
    }
    return currentInclude;
  }
}

interface QueryParams {
  dateFrom?: Date;
  dateTo?: Date;
  offset?: number;
  limit?: number;
  mspCountryCode?: string;
  mspPartyId?: string;
  cpoCountryCode?: string;
  cpoPartyId?: string;
}
