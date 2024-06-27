// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import { SingleTokenRequest, Token, TokenDTO } from '../model/Token';
import { ModelmockService } from './ModelmockService';
import { OcpiLogger } from '../util/logger';
import { TokensRepository } from '../repository/TokensRepository';

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
    this.logger.info(await this.tokenRepository.updateToken(token));
    // this.tokenRepository.updateToken(token)
    return new Token();
  }
}
