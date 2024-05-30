// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {Service} from 'typedi';
import {OcpiServerConfig} from '../config/ocpi.server.config';
import {OcpiNamespace} from '../util/ocpi.namespace';
import {OcpiLogger} from '../util/logger';
import { SystemConfig } from '@citrineos/base'
import {OcpiSequelizeInstance} from '../util/sequelize';
import { Location, PaginatedLocationResponse } from '../model/Location';
import { SequelizeRepository } from '@citrineos/data/dist/layers/sequelize';

@Service()
export class LocationsRepository extends SequelizeRepository<Location> {

  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance
  ) {
    super(ocpiSystemConfig as SystemConfig, logger, ocpiSequelizeInstance.sequelize);
  }

  // TODO do we need to calculate offset or are we good?
  public getLocations = async (
    limit: number,
    offset: number,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<PaginatedLocationResponse> => {
    const query: any = {
      limit,
      offset,
      ...(!dateFrom && !dateTo ? {} : {
        where: {
          lastUpdated: {
            between: [dateFrom, dateTo]
          }
        }
      })
    };

    const locations = await this.readAllByQuery(
      query,
      OcpiNamespace.Locations
    );

    const response = new PaginatedLocationResponse();
    response.data = locations;

    return response;
  };

  // you can also get by evseuid and connector id... so... be careful hahah
  public getLocationById();

}
