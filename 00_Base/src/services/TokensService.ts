// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import { SingleTokenRequest, Token } from '../model/Token';
import { OcpiLogger } from '../util/logger';
import { TokensRepository } from '../repository/TokensRepository';
import { PaginatedParams } from '../controllers/param/paginated.params';
import { AsyncJobName, AsyncJobStatus } from '../model/AsyncJobStatus';
import { TokensClientApi } from '../trigger/TokensClientApi';
import { buildPaginatedOcpiParams } from '../trigger/param/paginated.ocpi.params';
import { CountryCode } from '../util/util';
import { Role } from '../model/Role';
import { AsyncJobStatusRepository } from '../repository/AsyncJobStatus';
import { OcpiResponseStatusCode } from '../model/ocpi.response';
import { UnsuccessfulRequestException } from '../exception/UnsuccessfulRequestException';
import { Authorization } from '@citrineos/data';


@Service()
export class TokensService {
  constructor(
    private readonly logger: OcpiLogger,
    private readonly tokenRepository: TokensRepository,
    private readonly asyncJobStatusRepository: AsyncJobStatusRepository,
    private readonly client: TokensClientApi,
  ) {
  }

  async getSingleToken(
    tokenRequest: SingleTokenRequest,
  ): Promise<Token | undefined> {
    return await this.tokenRepository.getSingleToken(tokenRequest);
  }

  async saveToken(token: Token): Promise<Token> {
    // try {
    //   return this.tokenRepository.updateToken(token);
    // } catch (e) {
    //   this.logger.info(`Token not found, creating new token.`);
    return this.tokenRepository.saveToken(token);
    // }
  }

  async updateToken(token: Partial<Token>): Promise<Token> {
    return this.tokenRepository.updateToken(token);
  }

  async startFetchTokensByParty(
    countryCode: string,
    partyId: string,
    paginationParams?: PaginatedParams,
  ): Promise<AsyncJobStatus> {
    const existingJob = await this.asyncJobStatusRepository.readOnlyOneByQuery({
      where: {
        jobName: AsyncJobName.FETCH_OCPI_TOKENS,
        countryCode: countryCode,
        partyId: partyId,
        isFinished: false,
      },
    });
    if (existingJob) {
      throw new UnsuccessfulRequestException(
        `Another job for country ${countryCode} and party ${partyId} already in progress with Id ${existingJob.jobId}`,
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
      const totalTokens: Token[] = [];
      let batchTokens: Token[] | undefined;
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

        //TODO use actually next link
        const response = await this.client.getTokens(params);
        if (
          response.status_code !== OcpiResponseStatusCode.GenericSuccessCode
        ) {
          retryCount--;
        } else {
          batchTokens = response.data.map(dto => dto.toToken());
          try {
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
      this.logger.error(e);

      asyncJobStatus.failureMessage = JSON.stringify(e);
      asyncJobStatus.isFinished = true;
      await this.asyncJobStatusRepository.createOrUpdateAsyncJobStatus(
        asyncJobStatus,
      );

      throw new UnsuccessfulRequestException(`Could not fetch tokens. Error ${e}`);
    }
  }

  async getFetchTokensJob(jobId: string): Promise<AsyncJobStatus | undefined> {
    return await this.asyncJobStatusRepository.readByKey(jobId);
  }


  private mapPartialOcpiTokenToOcppAuthorization(ocpiToken: Partial<Token>): Authorization {
    return new Authorization();
  }
}
