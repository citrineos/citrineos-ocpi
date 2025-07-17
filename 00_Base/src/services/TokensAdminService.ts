// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import { OcpiLogger } from '../util/OcpiLogger';
import { TokensClientApi } from '../trigger/TokensClientApi';
import { buildPaginatedOcpiParams } from '../trigger/param/PaginatedOcpiParams';
import { OcpiResponseStatusCode } from '../model/OcpiResponse';
import { UnsuccessfulRequestException } from '../exception/UnsuccessfulRequestException';
import { CredentialsService } from './CredentialsService';
import {
  ClientInformation,
  ClientInformationProps,
} from '../model/ClientInformation';
import { Op } from 'sequelize';
import { BadRequestError, NotFoundError } from 'routing-controllers';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { UPDATE_TOKEN_MUTATION } from '../graphql/queries/token.queries';
import { TokenDTO } from '../model/DTO/TokenDTO';

// Import AsyncJob types from the base module exports which re-export from @citrineos/data
import {
  AsyncJobRequest,
  AsyncJobStatus,
  AsyncJobName,
  SequelizeAsyncJobStatusRepository,
} from '../index';

// Type alias for the repository interface expected by the service
type AsyncJobStatusRepository = SequelizeAsyncJobStatusRepository;

@Service()
export class TokensAdminService {
  constructor(
    private readonly logger: OcpiLogger,
    private readonly asyncJobStatusRepository: AsyncJobStatusRepository,
    private readonly client: TokensClientApi,
    private readonly credentialsService: CredentialsService,
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
  ) {}

  async startFetchTokensByParty(
    asyncJobRequest: AsyncJobRequest,
  ): Promise<AsyncJobStatus> {
    const existingJob = await this.getFetchTokensJobs(
      asyncJobRequest.mspCountryCode,
      asyncJobRequest.mspPartyId,
      asyncJobRequest.cpoCountryCode,
      asyncJobRequest.cpoPartyId,
      true,
    );

    if (existingJob && existingJob.length > 0) {
      throw new UnsuccessfulRequestException(
        `Another job for MSP ${asyncJobRequest.mspCountryCode}-${asyncJobRequest.mspPartyId} + CPO  ${asyncJobRequest.cpoCountryCode}-${asyncJobRequest.cpoPartyId} is already in progress with ID ${existingJob[0].jobId}`,
      );
    }

    const clientCredentials =
      await this.credentialsService.getClientInformationByClientCountryCodeAndPartyId(
        asyncJobRequest.mspCountryCode,
        asyncJobRequest.mspPartyId,
      );

    let asyncJobStatus: AsyncJobStatus | undefined = AsyncJobStatus.build({
      jobName: AsyncJobName.FETCH_OCPI_TOKENS,
      paginationParams: {
        limit: asyncJobRequest.paginatedParams?.limit ?? 1000,
        offset: asyncJobRequest.paginatedParams?.offset ?? 0,
      },
      mspCountryCode: asyncJobRequest.mspCountryCode,
      mspPartyId: asyncJobRequest.mspPartyId,
      cpoCountryCode: asyncJobRequest.cpoCountryCode,
      cpoPartyId: asyncJobRequest.cpoPartyId,
      isFailed: false,
      stopScheduled: false,
    });

    asyncJobStatus =
      await this.asyncJobStatusRepository.createAsyncJobStatus(asyncJobStatus);

    this.fetchTokens(asyncJobStatus, clientCredentials);

    return asyncJobStatus;
  }

  async fetchTokens(
    asyncJobStatus: AsyncJobStatus,
    clientCredentials: ClientInformation,
  ) {
    try {
      const clientToken = clientCredentials[ClientInformationProps.clientToken];
      const clientVersions = await clientCredentials.$get(
        ClientInformationProps.clientVersionDetails,
      );

      this.client.baseUrl = clientVersions[0].url;

      const params = buildPaginatedOcpiParams(
        asyncJobStatus.mspCountryCode,
        asyncJobStatus.mspPartyId,
        asyncJobStatus.cpoCountryCode,
        asyncJobStatus.cpoPartyId,
        asyncJobStatus.paginationParams.offset,
        asyncJobStatus.paginationParams.limit,
        asyncJobStatus.paginationParams.dateFrom,
        asyncJobStatus.paginationParams.dateTo,
      );
      params.authorization = clientToken;
      params.version = clientVersions[0].version;

      let finished = false;

      do {
        const response = await this.client.getTokens(params);
        if (
          response.status_code === OcpiResponseStatusCode.GenericSuccessCode
        ) {
          await this.updateTokens(response.data);

          asyncJobStatus =
            await this.asyncJobStatusRepository.updateAsyncJobStatus({
              jobId: asyncJobStatus.jobId,
              paginationParams: {
                limit: response.limit,
                offset: response.offset
                  ? response.offset
                  : asyncJobStatus.paginationParams.offset,
                dateFrom: asyncJobStatus.paginationParams.dateFrom,
                dateTo: asyncJobStatus.paginationParams.dateTo,
              },
              totalObjects: response.total!,
            });

          if (asyncJobStatus.stopScheduled) {
            finished = true;
            break;
          }

          params.offset = response.offset;
          params.limit = response.limit;

          finished = !response.link;
        } else {
          this.logger.error(
            'Received non-successful response from Tokens fetch for job ' +
              asyncJobStatus.jobId,
            response,
          );
          asyncJobStatus.isFailed = true;
          break;
        }
      } while (!finished);
    } catch (e) {
      this.logger.error(
        'Failed to fetch tokens for job ' + asyncJobStatus.jobId,
        e,
      );
      asyncJobStatus.isFailed = true;
    }

    if (asyncJobStatus.stopScheduled) {
      await this.asyncJobStatusRepository.updateAsyncJobStatus({
        jobId: asyncJobStatus.jobId,
        stoppedAt: new Date(),
        isFailed: asyncJobStatus.isFailed,
      });
    } else {
      await this.asyncJobStatusRepository.updateAsyncJobStatus({
        jobId: asyncJobStatus.jobId,
        finishedAt: new Date(),
        isFailed: asyncJobStatus.isFailed,
      });
    }
  }

  async stopFetchTokens(jobId: string): Promise<AsyncJobStatus> {
    let existingJob = await this.getFetchTokensJob(jobId);

    if (!existingJob) {
      throw new NotFoundError('Job not found');
    }

    if (existingJob.finishedAt) {
      throw new BadRequestError('Job already finished');
    }

    existingJob = await this.asyncJobStatusRepository.updateAsyncJobStatus({
      jobId: existingJob.jobId,
      stopScheduled: true,
    });

    return existingJob;
  }

  async resumeFetchTokens(jobId: string): Promise<AsyncJobStatus> {
    let existingJob = await this.getFetchTokensJob(jobId);

    if (!existingJob) {
      throw new NotFoundError('Job not found');
    }

    if (existingJob.finishedAt) {
      throw new BadRequestError('Job already finished');
    }

    if (!existingJob.finishedAt && !existingJob.stoppedAt) {
      throw new BadRequestError('Job already running');
    }

    const clientCredentials =
      await this.credentialsService.getClientInformationByClientCountryCodeAndPartyId(
        existingJob.mspCountryCode,
        existingJob.mspPartyId,
      );

    existingJob = await this.asyncJobStatusRepository.updateAsyncJobStatus({
      jobId: existingJob.jobId,
      stopScheduled: false,
      stoppedAt: null,
    });

    this.fetchTokens(existingJob, clientCredentials);

    return existingJob;
  }

  async getFetchTokensJob(jobId: string): Promise<AsyncJobStatus | undefined> {
    return await this.asyncJobStatusRepository.readByJobId(jobId);
  }

  async getFetchTokensJobs(
    mspCountryCode: string,
    mspPartyId: string,
    cpoCountryCode: string,
    cpoPartyId: string,
    active?: boolean,
  ): Promise<AsyncJobStatus[]> {
    const query: any = {
      jobName: AsyncJobName.FETCH_OCPI_TOKENS,
      mspCountryCode: mspCountryCode,
      mspPartyId: mspPartyId,
      cpoCountryCode: cpoCountryCode,
      cpoPartyId: cpoPartyId,
    };
    if (active) {
      query.finishedAt = { [Op.is]: null };
      query.stoppedAt = { [Op.is]: null };
    } else if (active === false) {
      query[Op.or] = [
        { finishedAt: { [Op.not]: null } },
        { stoppedAt: { [Op.not]: null } },
      ];
    }
    return await this.asyncJobStatusRepository.findAllByQuery({
      where: {
        ...query,
      },
    });
  }

  async deleteFetchTokensJob(
    jobId: string,
  ): Promise<AsyncJobStatus | undefined> {
    return await this.asyncJobStatusRepository.deleteByJobId(jobId);
  }

  private async updateTokens(tokens: TokenDTO[]) {
    for (const token of tokens) {
      try {
        const variables = { token };
        const result = await this.ocpiGraphqlClient.request<any>(
          UPDATE_TOKEN_MUTATION,
          variables,
        );
        const updatedToken = result.updateToken;
        if (!updatedToken) {
          this.logger.error(`Failed to update token ${token.uid}`);
        }
      } catch (e) {
        this.logger.error(`Failed to update token ${token.uid}`, e);
      }
    }
  }
}
