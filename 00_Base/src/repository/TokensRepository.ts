// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0


import { Service } from 'typedi';
import { SingleTokenRequest, Token, TokenDTO } from '../model/Token';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { OcpiLogger } from '../util/logger';
import { SystemConfig } from '@citrineos/base';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { instanceToPlain } from 'class-transformer';
import { UnknownTokenException } from '../exception/unknown.token.exception';
import { InvalidParamException } from '../exception/invalid.param.exception';



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

  async updateToken(partialToken: Partial<Token>) {
    if (partialToken.uid === undefined) {
      throw new InvalidParamException('uid is required');
    }
    if (partialToken.party_id === undefined) {
      throw new InvalidParamException('party_id is required');
    }
    if (partialToken.country_code === undefined) {
      throw new InvalidParamException('country_code is required');
    }
    const existingToken = await this.readOnlyOneByQuery({
      where: {
        uid: partialToken.uid,
        party_id: partialToken.party_id,
        country_code: partialToken.country_code,
      }});

    if (existingToken === undefined) {
      throw new UnknownTokenException('Token not found in the database');
    }
    //TODO update to repository method
    return await existingToken.update(partialToken);
  }
}

