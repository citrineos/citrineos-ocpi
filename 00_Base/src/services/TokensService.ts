// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import { SingleTokenRequest } from '../model/OcpiToken';
import { OcpiLogger } from '../util/logger';
import { TokensRepository } from '../repository/TokensRepository';
import { TokenDTO } from '../model/DTO/TokenDTO';
import { TokenType } from '../model/TokenType';

@Service()
export class TokensService {
  constructor(
    private readonly logger: OcpiLogger,
    private readonly tokenRepository: TokensRepository,
  ) {}

  async getSingleToken(
    tokenRequest: SingleTokenRequest,
  ): Promise<TokenDTO | undefined> {
    return await this.tokenRepository.getSingleToken(tokenRequest);
  }

  async updateToken(token: TokenDTO): Promise<TokenDTO> {
    return this.tokenRepository.updateToken(token);
  }

  async patchToken(
    countryCode: string,
    partyId: string,
    tokenUid: string,
    type: TokenType,
    token: Partial<TokenDTO>,
  ): Promise<TokenDTO> {
    return this.tokenRepository.patchToken(
      countryCode,
      partyId,
      tokenUid,
      type,
      token,
    );
  }
}
