// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import { OcpiToken, SingleTokenRequest } from '../model/OcpiToken';
import { OcpiSequelizeInstance } from '../util/sequelize';
import {
  Authorization,
  IdToken,
  IdTokenInfo,
  SequelizeAuthorizationRepository,
  SequelizeRepository,
  SequelizeTransaction,
} from '@citrineos/data';
import { OcpiLogger } from '../util/logger';
import { IdTokenEnumType, SystemConfig } from '@citrineos/base';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { UnknownTokenException } from '../exception/unknown.token.exception';
import { Op } from 'sequelize';
import { OcpiTokensMapper } from '../mapper/OcpiTokensMapper';
import { TokenDTO } from '../model/DTO/TokenDTO';
import { ServerConfig } from '../config/ServerConfig';
import { TokenType } from '../model/TokenType';

@Service()
export class TokensRepository extends SequelizeRepository<OcpiToken> {
  constructor(
    systemConfig: ServerConfig,
    private readonly logger: OcpiLogger,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
    private readonly authorizationRepository: SequelizeAuthorizationRepository,
  ) {
    super(
      systemConfig as SystemConfig,
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
      const ocppAuths = await this.getOcppAuths(
        tokenRequest.uid,
        tokenRequest.type,
      );
      if (ocppAuths.length === 0) {
        return undefined;
      }

      const ocpiToken = await this.getOcpiTokenFromAuths(
        tokenRequest.country_code,
        tokenRequest.party_id,
        tokenRequest.type,
        ocppAuths,
      );
      if (!ocpiToken) {
        return undefined;
      }

      return this.createNewTokenDto(ocpiToken, ocppAuths);
    } catch (error) {
      this.logger.error('Error retrieving single token', error);
      throw error;
    }
  }

  async getTokenDtoByIdToken(
    idToken: string,
    type: IdTokenEnumType,
  ): Promise<TokenDTO | undefined> {
    const ocppAuth =
      await this.authorizationRepository.readOnlyOneByQuerystring({
        idToken,
        type,
      });

    if (!ocppAuth) {
      throw new UnknownTokenException(
        `OCPP Auths not found in the database for token ${idToken}`,
      );
    }

    const ocpiToken = await this.getOcpiTokenByAuthorizationId(ocppAuth.id);

    if (!ocpiToken) {
      throw new UnknownTokenException(
        `Token ${idToken} for ${ocppAuth.id} not found in the database`,
      );
    }

    return OcpiTokensMapper.toDto(ocppAuth, ocpiToken);
  }

  async getOcpiTokenByAuthorizationId(
    authorizationId: string,
  ): Promise<OcpiToken | undefined> {
    const ocpiToken = await this.readOnlyOneByQuery({
      where: {
        authorization_id: authorizationId,
      },
    });
    if (!ocpiToken) {
      // TODO better error
      return Promise.resolve(undefined);
    }
    return Promise.resolve(ocpiToken);
  }

  /**
   * Saves a new token.
   *
   * @param {TokenDTO} tokenDto - The token to save.
   * @return {Promise<TokenDTO>} The saved token.
   */
  async updateToken(tokenDto: TokenDTO): Promise<TokenDTO> {
    const savedOcppAuth = await this.createOrUpdateOcppAuth(tokenDto);
    try {
      const ocpiToken = await this.createOrUpdateOcpiToken(
        savedOcppAuth?.id,
        tokenDto,
      );
      return OcpiTokensMapper.toDto(savedOcppAuth!, ocpiToken);
    } catch (error) {
      this.logger.error('Error saving token', error);
      throw error;
    }
  }

  async patchToken(
    countryCode: string,
    partyId: string,
    tokenUid: string,
    type: TokenType,
    partialToken: Partial<TokenDTO>,
  ): Promise<TokenDTO> {
    const ocppAuths = await this.getOcppAuths(tokenUid, type);

    if (ocppAuths.length === 0) {
      throw new UnknownTokenException(
        `OCPP Auths not found in the database for token ${tokenUid}`,
      );
    }

    const existingOcpiToken = await this.getOcpiTokenFromAuths(
      countryCode,
      partyId,
      type,
      ocppAuths,
    );

    if (!existingOcpiToken) {
      throw new UnknownTokenException(
        `Token ${partialToken.uid} not found in the database`,
      );
    }

    return await this.s.transaction(async (transaction) => {
      const updatedToken = await existingOcpiToken.update(partialToken, {
        where: { id: existingOcpiToken.id },
        returning: true,
        transaction,
      });
      const updatedAuthorization = await this.updateAuthorization(
        this.getMatchingAuth(updatedToken.authorization_id, ocppAuths)!,
        partialToken,
        transaction,
      );
      const newTokenDto = await OcpiTokensMapper.toDto(
        updatedAuthorization,
        updatedToken,
      );
      const savedOCPPAuth = await this.createOrUpdateOcppAuth(
        newTokenDto,
        transaction,
      );

      return OcpiTokensMapper.toDto(savedOCPPAuth!, updatedToken);
    });
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
        await this.updateToken(token);
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

  private async createOrUpdateOcpiToken(
    authorizationId: number,
    tokenDto: TokenDTO,
  ): Promise<OcpiToken> {
    const baseTokenData = {
      visual_number: tokenDto.visual_number,
      issuer: tokenDto.issuer,
      whitelist: tokenDto.whitelist,
      default_profile_type: tokenDto.default_profile_type,
      energy_contract: tokenDto.energy_contract,
      last_updated: tokenDto.last_updated,
      type: tokenDto.type,
    };

    const [savedOcpiToken, ocpiTokenCreated] = await this._readOrCreateByQuery({
      where: {
        authorization_id: authorizationId,
      },
      defaults: {
        ...baseTokenData,
        authorization_id: authorizationId,
        country_code: tokenDto.country_code,
        party_id: tokenDto.party_id,
      },
    });

    // TODO confirm all updatable properties
    if (!ocpiTokenCreated) {
      await this._updateByKey(baseTokenData, savedOcpiToken.id);
    }

    return savedOcpiToken;
  }

  private getMatchingAuth(
    id: number,
    ocppAuths: Authorization[],
  ): Authorization | undefined {
    return ocppAuths.find((ocppAuth) => ocppAuth.id === id);
  }

  private async getOcppAuths(
    uid: string,
    type: TokenType,
  ): Promise<Authorization[]> {
    return await Authorization.findAll({
      include: [
        {
          model: IdToken,
          where: {
            idToken: uid,
            type: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(type),
          },
        },
        {
          model: IdTokenInfo,
          include: [IdToken],
        },
      ],
    });
  }

  private async getOcpiTokenFromAuths(
    countryCode: string,
    partyId: string,
    type: TokenType,
    ocppAuths: Authorization[],
  ): Promise<OcpiToken | undefined> {
    return await this.readOnlyOneByQuery({
      where: {
        authorization_id: {
          [Op.in]: ocppAuths.map((ocppAuth) => ocppAuth.id),
        },
        country_code: countryCode,
        party_id: partyId,
        type: type,
      },
    });
  }

  private async updateAuthorization(
    existingAuth: Authorization,
    partialToken: Partial<TokenDTO>,
    transaction: SequelizeTransaction,
  ): Promise<Authorization> {
    const partialIdTokenInfo =
      OcpiTokensMapper.mapTokenDTOToPartialAuthorization(
        existingAuth,
        partialToken,
      );

    if (!partialIdTokenInfo) {
      return existingAuth;
    }

    const [updateCount, updatedIdTokenInfo] = await IdTokenInfo.update(
      partialIdTokenInfo,
      {
        where: { id: existingAuth.idTokenInfoId },
        returning: true,
        transaction,
      },
    );

    if (updateCount === 0) {
      this.logger.warn(
        `No updatable idTokenInfo found for auth ${existingAuth.id}`,
      );
      return existingAuth;
    }

    if (partialIdTokenInfo.groupIdToken) {
      await IdToken.update(partialIdTokenInfo.groupIdToken, {
        where: { id: updatedIdTokenInfo[0].groupIdTokenId },
      });
    }

    return await existingAuth.reload({
      include: [{ model: IdTokenInfo }],
      transaction,
    });
  }

  private async createNewTokenDto(
    updatedToken: OcpiToken,
    ocppAuths: Authorization[],
  ): Promise<TokenDTO> {
    return await OcpiTokensMapper.toDto(
      this.getMatchingAuth(updatedToken.authorization_id, ocppAuths)!,
      updatedToken,
    );
  }

  private async createOrUpdateOcppAuth(
    tokenDto: TokenDTO,
    transaction?: SequelizeTransaction,
  ): Promise<Authorization> {
    const ocppAuth = OcpiTokensMapper.mapOcpiTokenToOcppAuthorization(tokenDto);
    const queryCondition = {
      idToken: tokenDto.uid,
      type: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(tokenDto.type),
    };

    const savedAuth =
      await this.authorizationRepository.createOrUpdateByQuerystring(
        ocppAuth,
        queryCondition,
        transaction,
      );

    if (!savedAuth) {
      throw new UnknownTokenException(
        'Authorization could not be created upon saving token',
      );
    }

    return await savedAuth.reload({
      include: [IdToken, IdTokenInfo],
      transaction,
    });
  }
}
