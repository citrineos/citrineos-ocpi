// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import { SingleTokenRequest } from '../model/OcpiToken';
import { OcpiLogger } from '../util/logger';
import { TokensRepository } from '../repository/TokensRepository';
import { TokenDTO } from '../model/DTO/TokenDTO';

@Service()
export class TokensService {
  constructor(
    private readonly logger: OcpiLogger,
    private readonly tokenRepository: TokensRepository,
  ) {
  }

  async getSingleToken(
    tokenRequest: SingleTokenRequest,
  ): Promise<TokenDTO | undefined> {
    return await this.tokenRepository.getSingleToken(tokenRequest);
  }

  async saveToken(token: TokenDTO): Promise<TokenDTO> {
    return this.tokenRepository.saveToken(token);
  }

  async updateToken(token: Partial<TokenDTO>): Promise<TokenDTO> {
    return this.tokenRepository.updateToken(token);
  }
}
