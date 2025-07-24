// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import { OcpiLogger } from '../util/OcpiLogger';
import { SingleTokenRequest, TokenDTO } from '../model/DTO/TokenDTO';
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
import { TokensMapper } from '../mapper/TokensMapper';
import { IAuthorizationDto } from '@citrineos/base';

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
      type: TokensMapper.mapOcpiTokenTypeToOcppIdTokenType(
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

    if (!result.Authorizations || result.Authorizations.length === 0) {
      return undefined;
    }

    if (result.Authorizations.length > 1) {
      this.logger.warn(
        `Multiple authorizations found for token uid ${tokenRequest.uid}, type ${tokenRequest.type}, country code ${tokenRequest.country_code}, and party id ${tokenRequest.party_id}. Returning the first one. All entries: ${JSON.stringify(result.Authorizations)}`,
      );
    }
    return TokensMapper.toDto(result.Authorizations[0] as unknown as IAuthorizationDto);
  }

  async updateToken(token: TokenDTO): Promise<TokenDTO> {
    const where = {
      IdToken: {
        idToken: { _eq: token.uid },
        type: {
          _eq: TokensMapper.mapOcpiTokenTypeToOcppIdTokenType(token.type),
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
      .idToken as unknown as TokenDTO;
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
      type: TokensMapper.mapOcpiTokenTypeToOcppIdTokenType(type),
      countryCode,
      partyId,
    };
    const existingAuth =
      await this.ocpiGraphqlClient.request<ReadAuthorizationsQuery>(
        READ_AUTHORIZATION,
        variables,
      );
    if (
      !existingAuth.Authorizations ||
      existingAuth.Authorizations.length === 0
    ) {
      throw new Error('Token not found');
    }
    if (existingAuth.Authorizations.length > 1) {
      this.logger.warn(
        `Multiple authorizations found for token uid ${tokenUid}, type ${type}, country code ${countryCode}, and party id ${partyId}. Returning the first one. All entries: ${JSON.stringify(existingAuth.Authorizations)}`,
      );
    }
    const existingTokenDTO = TokensMapper.toDto(existingAuth.Authorizations[0] as unknown as IAuthorizationDto);
    // Merge existing token with patch
    const updatedToken: TokenDTO = { ...existingTokenDTO, ...token };
    const where = TokensMapper.toGraphqlWhere(updatedToken);
    const set = TokensMapper.toGraphqlSet(updatedToken);
    const updateVariables = { where, set };
    const result =
      await this.ocpiGraphqlClient.request<UpdateAuthorizationMutation>(
        UPDATE_TOKEN_MUTATION,
        updateVariables,
      );
    return TokensMapper.toDto(result.update_Authorizations?.returning[0] as unknown as IAuthorizationDto);
  }
}
