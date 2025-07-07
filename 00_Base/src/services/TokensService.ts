// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Inject, Service } from 'typedi';
import { SingleTokenRequest } from '../model/OcpiToken';
import { OcpiLogger } from '../util/OcpiLogger';
import { TokenDTO } from '../model/DTO/TokenDTO';
import { TokenType } from '../model/TokenType';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import {
  UPDATE_TOKEN_MUTATION,
  READ_AUTHORIZATION,
} from '../graphql/queries/token.queries';
import {
  ReadAuthorizationsQuery,
  UpdateAuthorizationMutation,
} from '../graphql/types/graphql';
import { OcpiTokensMapper } from '../mapper/OcpiTokensMapper';
import { Op } from 'sequelize';

@Service()
export class TokensService {
  constructor(
    private readonly logger: OcpiLogger,
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
  ) {}

  async getToken(
    tokenRequest: SingleTokenRequest,
  ): Promise<TokenDTO | undefined> {
    const variables = {
      idToken: tokenRequest.uid,
      type: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(
        tokenRequest?.type ?? TokenType.RFID,
      ),
      countryCode: tokenRequest.country_code,
      partyId: tokenRequest.party_id,
    };
    const result =
      await this.ocpiGraphqlClient.request<ReadAuthorizationsQuery>(
        READ_AUTHORIZATION,
        variables,
      );

    return result.Authorizations[0].IdToken as unknown as TokenDTO | undefined;
  }

  async updateToken(token: TokenDTO): Promise<TokenDTO> {
    const where = {
      IdToken: {
        idToken: { _eq: token.uid },
        type: {
          _eq: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(token.type),
        },
      },
      Tenant: {
        countryCode: { _eq: token.country_code },
        partyId: { _eq: token.party_id },
      },
    };

    const variables = { where, set: token };
    const result =
      await this.ocpiGraphqlClient.request<UpdateAuthorizationMutation>(
        UPDATE_TOKEN_MUTATION,
        variables,
      );
    return result.update_Authorizations?.returning[0]
      .IdToken as unknown as TokenDTO;
  }

  async patchToken(
    countryCode: string,
    partyId: string,
    tokenUid: string,
    type: TokenType,
    token: Partial<TokenDTO>,
  ): Promise<TokenDTO> {
    const variables = {
      idToken: tokenUid,
      type: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(type),
      countryCode,
      partyId,
    };
    const existingAuth =
      await this.ocpiGraphqlClient.request<ReadAuthorizationsQuery>(
        READ_AUTHORIZATION,
        variables,
      );
    const existingIdToken = existingAuth.Authorizations[0]
      ?.IdToken as unknown as TokenDTO | undefined;
    if (!existingIdToken) {
      throw new Error('Token not found');
    }
    // Merge existing token with patch
    const updatedToken: TokenDTO = { ...existingIdToken, ...token };
    const where = {
      IdToken: {
        idToken: { _eq: tokenUid },
        type: { _eq: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(type) },
      },
      Tenant: {
        countryCode: { _eq: countryCode },
        partyId: { _eq: partyId },
      },
    };
    const updateVariables = { where, set: updatedToken };
    const result =
      await this.ocpiGraphqlClient.request<UpdateAuthorizationMutation>(
        UPDATE_TOKEN_MUTATION,
        updateVariables,
      );
    return result.update_Authorizations?.returning[0]
      .IdToken as unknown as TokenDTO;
  }
}
