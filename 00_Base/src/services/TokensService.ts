// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Inject, Service } from 'typedi';
import { SingleTokenRequest } from '../model/OcpiToken';
import { OcpiLogger } from '../util/logger';
import { TokenDTO } from '../model/DTO/TokenDTO';
import { TokenType } from '../model/TokenType';
import { ITokensDatasource } from '../datasources/ITokensDatasource';
import { TokensDatasource } from '../datasources/TokensDatasource';

@Service()
export class TokensService {
  constructor(
    private readonly logger: OcpiLogger,
    @Inject(() => TokensDatasource)
    private readonly tokensDatasource: ITokensDatasource,
  ) {}

  async getSingleToken(
    tokenRequest: SingleTokenRequest,
  ): Promise<TokenDTO | undefined> {
    return await this.tokensDatasource.getToken(tokenRequest);
  }

  async updateToken(token: TokenDTO): Promise<TokenDTO> {
    return this.tokensDatasource.updateToken(token);
  }

  async patchToken(
    countryCode: string,
    partyId: string,
    tokenUid: string,
    type: TokenType,
    token: Partial<TokenDTO>,
  ): Promise<TokenDTO> {
    return this.tokensDatasource.patchToken(
      countryCode,
      partyId,
      tokenUid,
      type,
      token,
    );
  }
}
