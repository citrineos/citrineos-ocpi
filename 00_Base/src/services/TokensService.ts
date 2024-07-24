// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import { SingleTokenRequest } from '../model/OcpiToken';
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
import { CredentialsService } from './credentials.service';
import { ClientInformationProps } from '../model/ClientInformation';
import { TokenDTO } from '../model/DTO/TokenDTO';

@Service()
export class TokensService {
  constructor(
    private readonly logger: OcpiLogger,
    private readonly tokenRepository: TokensRepository,
    private readonly asyncJobStatusRepository: AsyncJobStatusRepository,
    private readonly tokensClientApi: TokensClientApi,
    private readonly credentialsService: CredentialsService,

  ) {}

  async getSingleToken(
    tokenRequest: SingleTokenRequest,
  ): Promise<TokenDTO | undefined> {
    return await this.tokenRepository.getSingleToken(tokenRequest);
  }

  async saveToken(token: TokenDTO): Promise<TokenDTO> {
    return this.tokenRepository.saveToken(token);
  }

  async updateToken(token: TokenDTO): Promise<TokenDTO> {
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

    let asyncJobStatus: AsyncJobStatus | undefined = AsyncJobStatus.build({
      jobName: AsyncJobName.FETCH_OCPI_TOKENS,
      paginationParams: paginationParams,
      countryCode: countryCode,
      partyId: partyId,
    });

    asyncJobStatus =
      await this.asyncJobStatusRepository.createOrUpdateAsyncJobStatus(
        asyncJobStatus,
      );

    this.fetchTokens(asyncJobStatus);

    return asyncJobStatus;
  }

  async fetchTokens(asyncJobStatus: AsyncJobStatus) {
    const retryLimit = 5;
    // TODO spin off fetching tokens without waiting here

    try {
      const limit = asyncJobStatus.paginatedParams?.limit ?? 1000;
      let offset = 0;
      let retryCount = 5;
      let totalTokensFetched = 0;
      let batchTokens: TokenDTO[] | undefined;

      const clientCredentials =
        await this.credentialsService.getClientInformationByClientCountryCodeAndPartyId(
          asyncJobStatus.countryCode,
          asyncJobStatus.partyId,
        );
      const token = clientCredentials[ClientInformationProps.clientToken];
      const clientVersions = await clientCredentials.$get(
        ClientInformationProps.clientVersionDetails,
      );

      this.tokensClientApi.baseUrl = clientVersions[0].url;

      let done = false;
      do {
        const params = buildPaginatedOcpiParams(
          asyncJobStatus.countryCode,
          asyncJobStatus.partyId,
          CountryCode.US, // TODO fromCountryCode and fromPartyId should be configured centrally based on env config
          Role.CPO,
          offset,
          limit,
          asyncJobStatus.paginatedParams?.dateFrom,
          asyncJobStatus.paginatedParams?.dateTo,
        );
        params.authorization = token;
        params.version = clientVersions[0].version;

        // TODO use actually next link
        const response = await this.tokensClientApi.getTokens(params);
        if (
          response.status_code !== OcpiResponseStatusCode.GenericSuccessCode
        ) {
          retryCount--;
        } else {
          batchTokens = response.data;
          try {
            await this.tokenRepository.updateBatchedTokens(batchTokens);
            asyncJobStatus.currentOffset = offset;
            if (!asyncJobStatus.totalObjects) {
              asyncJobStatus.totalObjects = response.total;
            }
            await this.asyncJobStatusRepository.createOrUpdateAsyncJobStatus(
              asyncJobStatus,
            );
          } catch (e) {
            this.logger.error(e);
          }
          totalTokensFetched += batchTokens.length;
          retryCount = retryLimit;
          offset += limit;
        }

        // TODO check if link to next page exists here instead of limit
        if (
          retryCount === 0 ||
          (batchTokens && totalTokensFetched >= asyncJobStatus.totalObjects!)
        ) {
          done = true;
        }
      } while (!done);

      asyncJobStatus.stopTime = new Date();
      asyncJobStatus.totalObjects = totalTokensFetched;
      asyncJobStatus.isFinished = true;
      this.asyncJobStatusRepository.createOrUpdateAsyncJobStatus(
        asyncJobStatus,
      );
      return asyncJobStatus;
    } catch (e) {
      this.logger.error(e);

      asyncJobStatus.failureMessage = JSON.stringify(e);
      asyncJobStatus.isFinished = true;
      await this.asyncJobStatusRepository.createOrUpdateAsyncJobStatus(
        asyncJobStatus,
      );

      throw new UnsuccessfulRequestException(
        `Could not fetch tokens. Error ${e}`,
      );
    }
  }

  async getFetchTokensJob(jobId: string): Promise<AsyncJobStatus | undefined> {
    return await this.asyncJobStatusRepository.readByKey(jobId);
  }
}
