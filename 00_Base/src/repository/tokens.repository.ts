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

    const query: any = {
      where: {
        country_code: tokenRequest.country_code,
        party_id: tokenRequest.party_id,
        uid: tokenRequest.uid,
        type: tokenRequest.type,
      },
    };

    return this.readOnlyOneByQuery(query);
  }

  async saveToken(token: Token) {
    return this.create(token);
  }

  async updateToken(token: Partial<Token>) {
    if (token.uid === undefined) {
      throw new Error('uid is required');
    }
    if (token.party_id === undefined) {
      throw new Error('party_id is required');
    }
    if (token.country_code === undefined) {
      throw new Error('country_code is required');
    }
    if (token.type === undefined) {
      throw new Error('type is required');
    }
    const newToken = Token.build({country_code: token.country_code, party_id: token.party_id, uid: token.uid, type: token.type});
    return this.updateAllByQuery(newToken, {
      where: {
        country_code: "US",
      },
    });
  }
}

