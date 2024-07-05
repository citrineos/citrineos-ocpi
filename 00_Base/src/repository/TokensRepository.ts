// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import { SingleTokenRequest, OCPIToken } from '../model/OCPIToken';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { SequelizeAuthorizationRepository, SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { OcpiLogger } from '../util/logger';
import { SystemConfig } from '@citrineos/base';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { UnknownTokenException } from '../exception/unknown.token.exception';
import { Op } from 'sequelize';
import { OCPITokensMapper } from '../mapper/OCPITokensMapper';
import { TokensValidators } from '../util/validators/TokensValidators';

@Service()
export class TokensRepository extends SequelizeRepository<OCPIToken> {

  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    private readonly logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
    private readonly authorizationRepository: SequelizeAuthorizationRepository,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.Tokens,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  /**
   * Retrieves a single token based on the provided SingleTokenRequest.
   *
   * @param {SingleTokenRequest} tokenRequest - The request object containing the token details.
   * @return {Promise<OCPIToken | undefined>} A promise that resolves to the retrieved token or undefined if not found.
   */
  async getSingleToken(
    tokenRequest: SingleTokenRequest,
  ): Promise<OCPIToken | undefined> {
    try {
      const ocppAuth = await this.authorizationRepository.readAllByQuerystring({
        idToken: tokenRequest.uid,
        type: OCPITokensMapper.mapSingleTokenRequestToIdTokenType(tokenRequest),
      });
      if (ocppAuth.length === 0) {
        return undefined;
      }
      // Ids don't have to be unique on there own, only in combination with the type. So we need to search for all possible ids
      const ocppAuthIds = ocppAuth.map(auth => auth.id);
      //Use query to validate the belongs to the right party
      const query: any = {
        where: {
          id: {
            [Op.in]: ocppAuthIds,
          },
          country_code: tokenRequest.country_code,
          party_id: tokenRequest.party_id,
          type: tokenRequest.type,
        },
      };

      return this.readOnlyOneByQuery(query);
    } catch (error) {
      this.logger.error('Error retrieving single token', error);
      throw error;
    }
  }

  /**
   * Saves a new token.
   *
   * @param {OCPIToken} token - The token to save.
   * @return {Promise<OCPIToken>} The saved token.
   */
  async saveToken(token: OCPIToken): Promise<OCPIToken> {

      const ocppAuth = OCPITokensMapper.mapOcpiTokenToOcppAuthorization(token);
      const newOcppAuth = await this.authorizationRepository.createOrUpdateByQuerystring(ocppAuth, {
        idToken: token.uid,
        type: OCPITokensMapper.mapTokenTypeToIdTokenType(token),
      });
      token.id = newOcppAuth!.id;
    try {
      const ocpiToken = await this.updateByKey(token.dataValues, token.id);
      if (ocpiToken) {
        return ocpiToken;
      }
      return await this.create(token);
    } catch (error) {
      this.logger.error('Error saving token', error);
      throw error;
    }
  }

  /**
   * Updates an existing token.
   *
   * @param {Partial<OCPIToken>} partialToken - The partial token to update.
   * @return {Promise<OCPIToken>} The updated token.
   * @throws {UnknownTokenException} If the token is not found.
   */
  async updateToken(partialToken: Partial<OCPIToken>): Promise<OCPIToken> {

    TokensValidators.validatePartialTokenForUniquenessRequiredFields(partialToken);

    const ocppAuthList = await this.authorizationRepository.readAllByQuerystring({
      idToken: partialToken.uid!,
      type: OCPITokensMapper.mapTokenTypeToIdTokenType(partialToken),
    });
    if (ocppAuthList.length == 0) {
      throw new UnknownTokenException('Token not found in the database');
    }
    // Ids don't have to be unique on there own, only in combination with the type. So we need to search for all possible ids
    const ocppAuthIds = ocppAuthList.map(auth => auth.id);
    //Use query to validate the belongs to the right party
    const query: any = {
      where: {
        id: {
          [Op.in]: ocppAuthIds,
        },
        country_code: partialToken.country_code,
        party_id: partialToken.party_id,
        type: partialToken.type,
      },
    };

    const existingOCPIToken = await this.readOnlyOneByQuery(query);
    if (!existingOCPIToken) throw new UnknownTokenException('Token not found in the database');

    partialToken.id = undefined;
    const updatedToken = await this.updateByKey(partialToken.dataValues,
      existingOCPIToken.id,
    );
    if (!updatedToken) {
      throw new UnknownTokenException('Token not found in the database');
    }

    const newOCPPAuth = OCPITokensMapper.mapOcpiTokenToOcppAuthorization(updatedToken);
    newOCPPAuth.id = existingOCPIToken.id;
    const updatedOcppAuth = await this.authorizationRepository.createOrUpdateByQuerystring(newOCPPAuth, {
      idToken: partialToken.uid!,
      type: OCPITokensMapper.mapTokenTypeToIdTokenType(partialToken),
    });

    if (!updatedOcppAuth) {
      throw new Error('Could not save token');
    }

    return updatedToken;
  }

  /**
   * Updates or creates tokens.
   *
   * @param {OCPIToken[]} tokens - Tokens to be created or updated.
   * @return {Promise<void>} A promise that resolves when the operation is complete.
   */
  async updateBatchedTokens(
    tokens: OCPIToken[],
  ): Promise<void> {
    const batchFailedTokens: OCPIToken[] = [];

    // update tokens
    //TODO save in bulk instead
    for (const token of tokens) {
      try {
        await this.saveToken(token);
      } catch (e) {
        this.logger.error(e);
        batchFailedTokens.push(token);
      }
    }

    if (batchFailedTokens.length > 0) {
      throw new Error(
        `Failed to fetch tokens: ${JSON.stringify(batchFailedTokens)}`,
      );
    }
  }

}
