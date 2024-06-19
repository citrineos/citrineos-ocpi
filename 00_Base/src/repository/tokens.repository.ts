// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0


import { Service } from 'typedi';
import { SingleTokenRequest, Token } from '../model/Token';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { OcpiLogger } from '../util/logger';
import { SystemConfig } from '@citrineos/base';
import { OcpiNamespace } from '../util/ocpi.namespace';


@Service()
export class TokensRepository extends SequelizeRepository<Token> {

  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    private readonly logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.Tokens,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  async getSingleToken(tokenRequest: SingleTokenRequest): Promise<Token | undefined> {

    this.logger.info('yay!', tokenRequest);
    const query: any = {
      where: {
        country_code: tokenRequest.country_code,
        party_id: tokenRequest.party_id,
        uid: tokenRequest.uid,
        type: tokenRequest.type
      },
    };

    return this.readOnlyOneByQuery(query);
  }

}

