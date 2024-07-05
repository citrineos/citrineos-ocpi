// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import { SingleTokenRequest, OCPIToken } from '../model/OCPIToken';
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
import { VersionNumber } from '../model/VersionNumber';
import { OCPITokensMapper } from '../mapper/OCPITokensMapper';


@Service()
export class TokensService {
  constructor(
    private readonly logger: OcpiLogger,
    private readonly tokenRepository: TokensRepository,
    private readonly asyncJobStatusRepository: AsyncJobStatusRepository,
    private readonly client: TokensClientApi,
    private readonly credentialsService: CredentialsService,
  ) {
  }

  async getSingleToken(
    tokenRequest: SingleTokenRequest,
  ): Promise<OCPIToken | undefined> {
    return await this.tokenRepository.getSingleToken(tokenRequest);
  }

  async saveToken(token: OCPIToken): Promise<OCPIToken> {
    // try {
    //   return this.tokenRepository.updateToken(token);
    // } catch (e) {
    //   this.logger.info(`Token not found, creating new token.`);
    return this.tokenRepository.saveToken(token);
    // }
  }

  async updateToken(token: Partial<OCPIToken>): Promise<OCPIToken> {
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
      let totalTokens = 0;
      let batchTokens: OCPIToken[] | undefined;

      const clientCredtials = await this.credentialsService.getClientInformationByClientCountryCodeAndPartyId(countryCode, partyId);
      const token = clientCredtials[ClientInformationProps.clientToken];
      const clientVersions = await clientCredtials.$get(
        ClientInformationProps.clientVersionDetails,
      );

      this.client.baseUrl = clientVersions[0].url;

      var done = false;
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
        params.authorization = token;
        //TODO get version from DB
        params.version = VersionNumber.TWO_DOT_TWO_DOT_ONE;

        //TODO use actually next link
        const response = await this.client.getTokens(params);
        if (
          response.status_code !== OcpiResponseStatusCode.GenericSuccessCode
        ) {
          retryCount--;
        } else {
          batchTokens = response.data.map(dto => OCPITokensMapper.mapTokenDtoToToken(dto));
          try {
            await this.tokenRepository.updateBatchedTokens(batchTokens);
            asyncJobStatus.currentOffset = offset;
            if(!asyncJobStatus.totalObjects){
              //TODO to test set a hardcoded total here remove after test
              response.total = 3;

              asyncJobStatus.totalObjects = response.total;
            }
            await this.asyncJobStatusRepository.createOrUpdateAsyncJobStatus(asyncJobStatus);
          } catch (e) {
            this.logger.error(e);
          }
          totalTokens += batchTokens.length;
          retryCount = retryLimit;
          offset += limit;
        }

        //TODO check if link to next page exists here instead of limit
        if (retryCount === 0 || (batchTokens && totalTokens >= asyncJobStatus.totalObjects!)) {
          done = true;
        }
      } while (!done);


      asyncJobStatus.stopTime = new Date();
      asyncJobStatus.totalObjects = totalTokens;
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

}
