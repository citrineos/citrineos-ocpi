import { ITokensDatasource } from './ITokensDatasource';
import { TokenDTO } from '../model/DTO/TokenDTO';
import {
  Authorization,
  IdToken,
  IdTokenInfo,
  SequelizeAuthorizationRepository,
  SequelizeTransaction,
} from '@citrineos/data';
import { OcpiToken, SingleTokenRequest } from '../model/OcpiToken';
import { OcpiTokensMapper } from '../mapper/OcpiTokensMapper';
import { TokenType } from '../model/TokenType';
import { Op } from 'sequelize';
import { OcpiLogger } from '../util/OcpiLogger';
import { TokensRepository } from '../repository/TokensRepository';
import { IdTokenEnumType } from '@citrineos/base';
import { UnknownTokenException } from '../exception/UnknownTokenException';
import { Service } from 'typedi';

@Service()
export class TokensDatasource implements ITokensDatasource {
  constructor(
    private readonly authorizationRepository: SequelizeAuthorizationRepository,
    private readonly tokensRepository: TokensRepository,
    private readonly logger: OcpiLogger,
  ) {}

  async getToken(
    tokenRequest: SingleTokenRequest,
  ): Promise<TokenDTO | undefined> {
    try {
      const ocppAuths = await this.authorizationRepository.readAllByQuerystring(
        {
          idToken: tokenRequest.uid,
          type: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(
            tokenRequest?.type ?? TokenType.RFID,
          ),
        },
      );

      if (ocppAuths.length === 0) {
        return undefined;
      }

      const ocpiToken = await this.tokensRepository.readOnlyOneByQuery({
        where: {
          authorization_id: {
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
        this.getMatchingAuth(ocpiToken.authorization_id, ocppAuths)!,
        ocpiToken,
      );
    } catch (error) {
      this.logger.error('Error retrieving single token', error);
      throw error;
    }
  }

  async getTokenByIdToken(
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

  async patchToken(
    countryCode: string,
    partyId: string,
    tokenUid: string,
    type: TokenType,
    partialToken: Partial<TokenDTO>,
  ): Promise<TokenDTO> {
    const ocppAuths = await this.authorizationRepository.readAllByQuerystring({
      idToken: tokenUid,
      type: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(type),
    });

    if (ocppAuths.length === 0) {
      throw new UnknownTokenException(
        `OCPP Auths not found in the database for token ${tokenUid}`,
      );
    }

    const existingOcpiToken = await this.tokensRepository.readOnlyOneByQuery({
      where: {
        authorization_id: {
          [Op.in]: ocppAuths.map((ocppAuth) => ocppAuth.id),
        },
        country_code: countryCode,
        party_id: partyId,
        type: type,
      },
    });

    if (!existingOcpiToken) {
      throw new UnknownTokenException(
        `Token ${partialToken.uid} not found in the database`,
      );
    }

    return await this.tokensRepository.patch(async (transaction) => {
      const updatedToken = await existingOcpiToken.update(partialToken, {
        where: { id: existingOcpiToken.id },
        returning: true,
        transaction,
      });
      const updatedAuthorization = await this.patchOcppAuth(
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

  async updateToken(tokenDto: TokenDTO): Promise<TokenDTO> {
    const mappedOcppAuth =
      OcpiTokensMapper.mapOcpiTokenToOcppAuthorization(tokenDto);
    const savedOcppAuth =
      await this.authorizationRepository.createOrUpdateByQuerystring(
        mappedOcppAuth,
        {
          idToken: tokenDto.uid,
          type: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(
            tokenDto.type,
          ),
        },
      );

    if (!savedOcppAuth) {
      throw new UnknownTokenException(
        'Authorization could not be created upon saving token',
      );
    }

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

  async getOcpiTokenByAuthorizationId(
    authorizationId: string,
  ): Promise<OcpiToken | undefined> {
    const ocpiToken = await this.tokensRepository.readOnlyOneByQuery({
      where: {
        authorization_id: authorizationId,
      },
    });
    if (!ocpiToken) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(ocpiToken);
  }

  private getMatchingAuth(
    id: number,
    ocppAuths: Authorization[],
  ): Authorization | undefined {
    return ocppAuths.find((ocppAuth) => ocppAuth.id === id);
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

    const [savedOcpiToken, ocpiTokenCreated] =
      await this.tokensRepository.readOrCreateByQuery({
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

    if (!ocpiTokenCreated) {
      await this.tokensRepository.updateByKey(baseTokenData, savedOcpiToken.id);
    }

    return savedOcpiToken;
  }

  private async patchOcppAuth(
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
}
