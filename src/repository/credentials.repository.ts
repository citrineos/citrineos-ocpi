// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {SequelizeRepository} from '@citrineos/data';
import {SystemConfig, UnauthorizedException} from '@citrineos/base';
import {Credentials} from '../model/Credentials';
import {OcpiNamespace} from '../util/ocpi.namespace';
import {Service} from 'typedi';
import {OcpiServerConfig} from '../config/ocpi.server.config';
import {OcpiLogger} from '../util/logger';
import {OcpiSequelizeInstance} from '../util/sequelize';

@Service()
export class CredentialsRepository extends SequelizeRepository<Credentials> {

  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance
  ) {
    super(ocpiSystemConfig as SystemConfig, logger, ocpiSequelizeInstance.sequelize);
  }

  public async authorizeToken(token: string, countryCode?: string, partyId?: string): Promise<boolean> {
    const existingCredentials = await this.getExistingCredentials(token, countryCode, partyId);
    if (!existingCredentials) {
      throw new UnauthorizedException('Credentials not found for given token');
    } else {
      return true;
    }
  }

  private getExistingCredentials = async (
    token: string,
    countryCode?: string,
    partyId?: string
  ): Promise<Credentials> => {
    const query: any = {
      where: {token}
    };
    if (countryCode && partyId) {
      query.where['roles'] = {
        country_code: countryCode,
        party_id: partyId
      };
    }
    return await this.readByQuery(
      query,
      OcpiNamespace.Credentials
    );
  };
}
