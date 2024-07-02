// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import { SingleTokenRequest, Token, TokenDTO } from '../model/Token';
import { ModelmockService } from './ModelmockService';
import { OcpiLogger } from '../util/logger';
import { TokensRepository } from '../repository/TokensRepository';
import { PaginatedParams } from '../controllers/param/paginated.params';
import { AsyncJobName, AsyncJobStatus } from '../model/AsyncJobStatus';
import { AuthorizationStatusEnumType, IdTokenEnumType, IdTokenInfoType, IdTokenType } from '@citrineos/base';
import { TokenType } from '../model/TokenType';
import { TokensClientApi } from '../trigger/TokensClientApi';
import { buildPaginatedOcpiParams } from '../trigger/param/paginated.ocpi.params';
import { CountryCode } from '../util/util';
import { Role } from '../model/Role';
import { AsyncJobStatusRepository } from '../repository/AsyncJobStatus';
import { OcpiResponseStatusCode } from '../model/ocpi.response';
import { UnsuccessfulRequestException } from '../exception/UnsuccessfulRequestException';
import { Authorization } from '@citrineos/data';
import { AuthorizationRepository } from '../repository/AuthorizationRepository';

@Service()
export class TokensService {
  constructor(
    private readonly modelMockService: ModelmockService,
    private readonly logger: OcpiLogger,
    private readonly tokenRepository: TokensRepository,
    private readonly asyncJobStatusRepository: AsyncJobStatusRepository,
    private readonly client: TokensClientApi,
    private readonly authorizationRepository: AuthorizationRepository,
  ) {
  }

  // TODO get existing token
  async getSingleToken(
    tokenRequest: SingleTokenRequest,
  ): Promise<Token | undefined> {
    return await this.tokenRepository.getSingleToken(tokenRequest);
  }

  async saveToken(token: Token): Promise<Token> {
    this.authorizationRepository.createOrUpdateByQuerystring(this.mapOcpiTokenToOcppAuthorization(token), {
      idToken: token.uid,
      type: this.mapTokenTypeToIdTokenType(token.type),
    });
    try {
      return this.tokenRepository.updateToken(token);
    } catch (e) {
      this.logger.info(`Token not found, creating new token.`);
      return this.tokenRepository.saveToken(token);
    }
  }

  async updateToken(token: Partial<Token>): Promise<Token> {
    return this.tokenRepository.updateToken(token);
  }

  async startFetchTokensByParty(
    countryCode: string,
    partyId: string,
    paginationParams?: PaginatedParams,
  ): Promise<AsyncJobStatus> {
    const existingJob = await this.asyncJobStatusRepository.existByQuery({
      where: {
        jobName: AsyncJobName.FETCH_OCPI_TOKENS,
        countryCode: countryCode,
        partyId: partyId,
        isFinished: false,
      },
    });
    if (existingJob > 0) {
      throw new UnsuccessfulRequestException(
        `Another job for country ${countryCode} and party ${partyId}  already in progress.`,
      );
    }

    const retryLimit = 5;
    // TODO spin off fetching tokens without waiting here
    let asyncJobStatus: AsyncJobStatus | undefined = AsyncJobStatus.build({
      jobName: AsyncJobName.FETCH_OCPI_TOKENS,
      paginationParams: paginationParams,
      countryCode: countryCode,
      partyId: partyId,
    });
    try {
      asyncJobStatus =
        await this.asyncJobStatusRepository.createOrUpdateAsyncJobStatus(
          asyncJobStatus,
        );

      const limit = paginationParams?.limit ?? 1000;
      let offset = 0;
      let retryCount = 5;
      const totalTokens: TokenDTO[] = [];
      let batchTokens: TokenDTO[] | undefined;
      do {
        const params = buildPaginatedOcpiParams(
          countryCode,
          partyId,
          CountryCode.US, // TODO fromCountryCode and fromPartyId should be configured centrally based on env config
          Role.CPO,
          offset,
          limit,
          paginationParams?.date_from,
          paginationParams?.date_to,
        );
        const response = await this.client.getTokens(params);
        if (
          response.status_code !== OcpiResponseStatusCode.GenericSuccessCode
        ) {
          retryCount--;
        } else {
          batchTokens = response.data;
          try {
            //TODO save to OCPP Auth
            await this.tokenRepository.updateBatchedTokens(batchTokens);
            asyncJobStatus.currentOffset = offset;
            await this.asyncJobStatusRepository.createOrUpdateAsyncJobStatus(asyncJobStatus);
          } catch (e) {
            this.logger.error(e);
          }
          totalTokens.push(...batchTokens);
          retryCount = retryLimit;
          offset += limit;

        }
      } while (retryCount > 0 || (batchTokens && batchTokens.length === limit));


      asyncJobStatus.stopTime = new Date();
      asyncJobStatus.totalObjects = totalTokens.length;
      asyncJobStatus.isFinished = true;
      this.asyncJobStatusRepository.createOrUpdateAsyncJobStatus(asyncJobStatus);
      return asyncJobStatus;
    } catch (e) {
      console.error(e);

      asyncJobStatus.failureMessage = JSON.stringify(e);
      asyncJobStatus.isFinished = true;
      await this.asyncJobStatusRepository.createOrUpdateAsyncJobStatus(
        asyncJobStatus,
      );

      throw new UnsuccessfulRequestException('Could not fetch tokens.');
    }
  }

  async getFetchTokensJob(jobId: string): Promise<AsyncJobStatus | undefined> {
    return await this.asyncJobStatusRepository.readByKey(jobId);
  }

  private mapIdTokenTypeToTokenType(idTokenType: IdTokenEnumType): TokenType {
    switch (idTokenType) {
      case IdTokenEnumType.eMAID:
      case IdTokenEnumType.NoAuthorization:
      case IdTokenEnumType.KeyCode: // TODO: decide if this is correct
      case IdTokenEnumType.MacAddress: // TODO: decide if this is correct
        return TokenType.OTHER;
      case IdTokenEnumType.ISO14443:
      case IdTokenEnumType.ISO15693:
        return TokenType.RFID;
      case IdTokenEnumType.Central:
      case IdTokenEnumType.Local:
        return TokenType.APP_USER;
      default:
        throw new Error(`Unknown id token type: ${idTokenType}`);
    }
  }


  /** TODO: Are these mappings correct?
   *
   * @param tokenType
   * @private
   */
  private mapTokenTypeToIdTokenType(tokenType: TokenType): IdTokenEnumType {
    switch (tokenType) {
      case TokenType.OTHER:
        return IdTokenEnumType.eMAID;
      case TokenType.RFID:
        //TODO how to decide on RFID type? Config?
        return IdTokenEnumType.ISO14443;
      case TokenType.APP_USER:
        return IdTokenEnumType.Central;//TODO Or is this eMAID?
      default:
        throw new Error(`Unknown token type: ${tokenType}`);
    }
  }

  private mapOcpiTokenToOcppAuthorization(ocpiToken: Token): Authorization {
    return Authorization.build({
      idToken: {
        idToken: ocpiToken.uid,
        type: this.mapTokenTypeToIdTokenType(ocpiToken.type),
      } as IdTokenType,
      idTokenInfo: {
        status: ocpiToken.valid ? 'Accepted' as AuthorizationStatusEnumType : 'Blocked' as AuthorizationStatusEnumType,
        groupIdToken: {
          idToken: ocpiToken.contract_id,
          type: this.mapTokenTypeToIdTokenType(ocpiToken.type),
        } as IdTokenType,
      } as IdTokenInfoType,
    });
  }
}
