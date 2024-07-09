// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import { OcpiToken, SingleTokenRequest } from '../model/OcpiToken';
import { OcpiSequelizeInstance } from '../util/sequelize';
import {
  Authorization,
  SequelizeAuthorizationRepository,
  SequelizeRepository,
} from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { OcpiLogger } from '../util/logger';
import { SystemConfig } from '@citrineos/base';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { UnknownTokenException } from '../exception/unknown.token.exception';
import { Op } from 'sequelize';
import { OcpiTokensMapper } from '../mapper/OcpiTokensMapper';
import { TokensValidators } from '../util/validators/TokensValidators';
import { TokenDTO } from '../model/DTO/TokenDTO';
import { TokenType } from '../model/TokenType';

@Service()
export class TokensRepository extends SequelizeRepository<OcpiToken> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    private readonly logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
    private readonly authorizationRepository: SequelizeAuthorizationRepository,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.OcpiToken,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  /**
   * Retrieves a single token based on the provided SingleTokenRequest.
   *
   * @param {SingleTokenRequest} tokenRequest - The request object containing the token details.
   * @return {Promise<OcpiToken | undefined>} A promise that resolves to the retrieved token or undefined if not found.
   */
  async getSingleToken(
    tokenRequest: SingleTokenRequest,
  ): Promise<TokenDTO | undefined> {
    try {
      const ocppAuths = await this.authorizationRepository.readAllByQuerystring(
        {
          idToken: tokenRequest.uid,
          type: tokenRequest.type
            ? OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(
                tokenRequest!.type,
              )
            : TokenType.RFID,
        },
      );

      if (ocppAuths.length === 0) {
        return undefined;
      }

      const ocpiToken = await this.readOnlyOneByQuery({
        where: {
          id: {
            [Op.in]: ocppAuths.map((ocppAuth) => ocppAuth.id),
          },
          country_code: tokenRequest.country_code,
          party_id: tokenRequest.party_id,
          type: tokenRequest.type,
        },
      });

      if (!ocpiToken) {
        return undefined;
      }

      return OcpiTokensMapper.toDto(
        this.getMatchingAuth(ocpiToken.id, ocppAuths)!,
        ocpiToken,
      );
    } catch (error) {
      this.logger.error('Error retrieving single token', error);
      throw error;
    }
  }

  /**
   * Saves a new token.
   *
   * @param {TokenDTO} tokenDto - The token to save.
   * @return {Promise<TokenDTO>} The saved token.
   */
  async saveToken(tokenDto: TokenDTO): Promise<TokenDTO> {
    const mappedOcppAuth = OcpiTokensMapper.mapOcpiTokenToOcppAuthorization(tokenDto);
    const savedOcppAuth =
      await this.authorizationRepository.createOrUpdateByQuerystring(
        mappedOcppAuth,
        {
          idToken: tokenDto.uid,
          type: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(tokenDto.type),
        },
      );

    try {
      const ocpiToken = await this.createOrUpdateOcpiToken(OcpiTokensMapper.toEntity(tokenDto));
      return OcpiTokensMapper.toDto(savedOcppAuth!, ocpiToken);
    } catch (error) {
      this.logger.error('Error saving token', error);
      throw error;
    }
  }

  /**
   * Updates an existing token.
   *
   * @param {Partial<OcpiToken>} partialToken - The partial token to update.
   * @return {Promise<OcpiToken>} The updated token.
   * @throws {UnknownTokenException} If the token is not found.
   */
  async updateToken(partialToken: TokenDTO): Promise<TokenDTO> {
    TokensValidators.validatePartialTokenForUniquenessRequiredFields(
      partialToken,
    );

    const ocppAuths = await this.authorizationRepository.readAllByQuerystring({
      idToken: partialToken.uid!,
      type: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(
        partialToken.type,
      ),
    });

    if (ocppAuths.length === 0) {
      throw new UnknownTokenException('Token not found in the database');
    }

    const existingOcpiToken = await this.readOnlyOneByQuery({
      where: {
        id: {
          [Op.in]: ocppAuths.map((ocppAuth) => ocppAuth.id),
        },
        country_code: partialToken.country_code,
        party_id: partialToken.party_id,
        type: partialToken.type,
      },
    });

    if (!existingOcpiToken) {
      throw new UnknownTokenException('Token not found in the database');
    }

    const updatedToken = await this.updateByKey(
      partialToken,
      existingOcpiToken.id,
    );

    if (!updatedToken) {
      throw new UnknownTokenException('Token not found in the database');
    }
    //
    // const newOCPPAuth =
    //   OCPITokensMapper.mapOcpiTokenToOcppAuthorization(updatedToken);
    // newOCPPAuth.id = existingOCPIToken.id;
    // const updatedOcppAuth =
    //   await this.authorizationRepository.createOrUpdateByQuerystring(
    //     newOCPPAuth,
    //     {
    //       idToken: partialToken.uid!,
    //       type: OCPITokensMapper.mapOcpiTokenTypeToOcppIdTokenType(partialToken.type),
    //     },
    //   );
    //
    // if (!updatedOcppAuth) {
    //   throw new Error('Could not save token');
    // }

    return new TokenDTO();
  }

  /**
   * Updates or creates tokens.
   *
   * @param {OcpiToken[]} tokens - Tokens to be created or updated.
   * @return {Promise<void>} A promise that resolves when the operation is complete.
   */
  async updateBatchedTokens(tokens: TokenDTO[]): Promise<void> {
    const batchFailedTokens: TokenDTO[] = [];

    // TODO: do an actual bulk update
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

  async createOrUpdateOcpiToken(token: OcpiToken): Promise<OcpiToken> {
    const [savedOcpiToken, ocpiTokenCreated] = await this._readOrCreateByQuery({
      where: {
        country_code: token.country_code,
        party_id: token.party_id,
        type: token.type,
        contract_id: token.contract_id
      },
      defaults: {
        country_code: token.country_code,
        party_id: token.party_id,
        type: token.type,
        contract_id: token.contract_id,
        last_updated: token.last_updated
      },
    });
    // TODO confirm all updatable properties
    if (!ocpiTokenCreated) {
      await this._updateByKey(
        {
          type: token.type,
          contract_id: token.contract_id,
          visual_number: token.visual_number,
          issuer: token.issuer,
          whitelist: token.whitelist,
          default_profile_type: token.default_profile_type,
          energy_contract: token.energy_contract,
          last_updated: token.last_updated
        },
        savedOcpiToken.id,
      );
    }

    return savedOcpiToken;
  }

  getMatchingAuth(
    id: string,
    ocppAuths: Authorization[],
  ): Authorization | undefined {
    return ocppAuths.find((ocppAuth) => ocppAuth.id === id);
  }
}
