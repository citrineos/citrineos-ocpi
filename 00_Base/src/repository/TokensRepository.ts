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
import { UnknownTokenException } from '../exception/unknown.token.exception';
import { InvalidParamException } from '../exception/invalid.param.exception';
import { Op } from 'sequelize';

@Service()
export class TokensRepository extends SequelizeRepository<Token> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    private readonly logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.Tokens,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  async getSingleToken(
    tokenRequest: SingleTokenRequest,
  ): Promise<Token | undefined> {
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
    return this._create(token);
  }

  async updateToken(partialToken: Partial<Token>): Promise<Token> {
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
      },
    });

    if (existingToken === undefined) {
      throw new UnknownTokenException('Token not found in the database');
    }

    const updatedToken = await this._updateByKey(
        {
          ...partialToken,
        },
        existingToken.id,
    );
    if (!updatedToken) {
      throw new UnknownTokenException('Token not found in the database');
    }
    return updatedToken;
  }

  /**
   * Set existing tokens to invalid and then update or create tokens
   * @param tokenDTOs tokens need to be created or updated
   * @param countryCode country code
   * @param partyId party id
   * @param dateFrom last update timestamp from
   * @param dateTo last update timestamp to
   */
  async updateBatchedTokens(
    //TODO map to Token first
    tokenDTOs: TokenDTO[]
  ): Promise<void> {
    const batchFailedTokens: TokenDTO[] = [];
    await this.s.transaction(async (transaction) => {
      // update tokens
      for (const tokenDTO of tokenDTOs) {
        try {
          const [storedToken, created] = await this.s.models[
            Token.MODEL_NAME
          ].findOrCreate({
            where: {
              country_code: tokenDTO.country_code,
              party_id: tokenDTO.party_id,
              uid: tokenDTO.uid,
              type: tokenDTO.type,
            },
            defaults: {
              ...tokenDTO,
            },
            transaction,
          });
          if (!created) {
            await this.s.models[Token.MODEL_NAME].update({...tokenDTO}, {
                where: {
                  id: (storedToken as Token).id,
                },
                transaction,
            });
          }
        } catch (e) {
          this.logger.error(e);
          batchFailedTokens.push(tokenDTO);
        }
      }
    });

    if (batchFailedTokens.length > 0) {
      throw new Error(
        `Failed to fetch tokens: ${JSON.stringify(batchFailedTokens)}`,
      );
    }
  }

}
