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
import { AsyncJobStatus, AsyncJobStatusDTO } from '../model/AsyncJobStatus';

@Service()
export class TokensService {
  constructor(
    private readonly modelMockService: ModelmockService,
    private readonly logger: OcpiLogger,
    private readonly tokenRepository: TokensRepository,
  ) {
  }

  // TODO get existing token
  async getSingleToken(tokenRequest: SingleTokenRequest): Promise<Token | undefined> {

    return await this.tokenRepository.getSingleToken(tokenRequest);

  }

  // TODO add new or update token

  async saveToken(token: Token): Promise<Token> {
    console.log('Yay!');
    return this.tokenRepository.saveToken(token);
  }

  async updateToken(token: Partial<Token>): Promise<Token> {
    return this.tokenRepository.updateToken(token);
  }
  async startFetchTokensByParty(countryCode: string, partyId: string, paginationParams?: PaginatedParams): Promise<AsyncJobStatus> {
    //TODO spin off fetching tokens without waiting here
    //TODO create jobId and save to DB together with countrycode and partyId and start date and pagination params and potentially progress

    //TODO return running Job Object with jobId
    return new AsyncJobStatus()
  }

  async getFetchTokensJob(countryCode: string, partyId: string, jobId: string): Promise<AsyncJobStatus> {
    //TODO return running Job Object with jobId
    return new AsyncJobStatus()
  }
}
