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
import { TokensMapper } from '../mapper/TokensMapper';
import { IAuthorizationDto } from '@citrineos/base';
import {
  ReadAuthorizationsQueryResult,
  ReadAuthorizationsQueryVariables,
  UpdateAuthorizationMutationResult,
  UpdateAuthorizationMutationVariables,
} from '../graphql/operations';

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
    const result = await this.ocpiGraphqlClient.request<
      ReadAuthorizationsQueryResult,
      ReadAuthorizationsQueryVariables
    >(READ_AUTHORIZATION, variables);

    if (!result.Authorizations || result.Authorizations.length === 0) {
      return undefined;
    }

    if (result.Authorizations.length > 1) {
      this.logger.warn(
        `Multiple authorizations found for token uid ${tokenRequest.uid}, type ${tokenRequest.type}, country code ${tokenRequest.country_code}, and party id ${tokenRequest.party_id}. Returning the first one. All entries: ${JSON.stringify(result.Authorizations)}`,
      );
    }
    return TokensMapper.toDto(result.Authorizations[0] as IAuthorizationDto);
  }

  async updateToken(token: TokenDTO): Promise<TokenDTO> {
    const authorization =
      TokensMapper.mapOcpiTokenToPartialOcppAuthorization(token);
    const variables = {
      idToken: authorization.idToken,
      type: authorization.idTokenType,
      countryCode: token.country_code,
      partyId: token.party_id,
      additionalInfo: authorization.additionalInfo,
      status: authorization.status,
      language1: authorization.language1,
    };
    const result = await this.ocpiGraphqlClient.request<
      UpdateAuthorizationMutationResult,
      UpdateAuthorizationMutationVariables
    >(UPDATE_TOKEN_MUTATION, variables);
    return TokensMapper.toDto(
      result.update_Authorizations?.returning[0] as IAuthorizationDto,
    );
  }

  async patchToken(
    countryCode: string,
    partyId: string,
    tokenUid: string,
    type: TokenType,
    token: Partial<TokenDTO>,
  ): Promise<TokenDTO> {
    const authorization =
      TokensMapper.mapOcpiTokenToPartialOcppAuthorization(token);
    const updateVariables = {
      idToken: tokenUid,
      type: TokensMapper.mapOcpiTokenTypeToOcppIdTokenType(type),
      countryCode: countryCode,
      partyId: partyId,
      additionalInfo: authorization.additionalInfo,
      status: authorization.status,
      language1: authorization.language1,
    };
    const result = await this.ocpiGraphqlClient.request<
      UpdateAuthorizationMutationResult,
      UpdateAuthorizationMutationVariables
    >(UPDATE_TOKEN_MUTATION, updateVariables);
    return TokensMapper.toDto(
      result.update_Authorizations?.returning[0] as IAuthorizationDto,
    );
  }
}
