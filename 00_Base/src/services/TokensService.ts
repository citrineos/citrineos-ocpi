// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service } from 'typedi';
import { OcpiLogger } from '../util/OcpiLogger';
import { SingleTokenRequest, TokenDTO } from '../model/DTO/TokenDTO';
import { TokenType } from '../model/TokenType';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import {
  UPDATE_TOKEN_MUTATION,
  READ_AUTHORIZATION,
  GET_AUTHORIZATION_BY_TOKEN,
  GET_GROUP_AUTHORIZATION,
  CREATE_AUTHORIZATION_MUTATION,
} from '../graphql/queries/token.queries';
import { TokensMapper } from '../mapper/TokensMapper';
import {
  AuthorizationStatusType,
  IAuthorizationDto,
  IChargingStationDto,
  IdTokenType,
} from '@citrineos/base';
import {
  Authorizations_Set_Input,
  CreateAuthorizationMutationResult,
  CreateAuthorizationMutationVariables,
  GetAuthorizationByTokenQueryResult,
  GetAuthorizationByTokenQueryVariables,
  GetChargingStationByIdQueryResult,
  GetChargingStationByIdQueryVariables,
  GetGroupAuthorizationQueryResult,
  GetGroupAuthorizationQueryVariables,
  GetTenantPartnerByIdQueryResult,
  GetTenantPartnerByIdQueryVariables,
  ReadAuthorizationsQueryResult,
  ReadAuthorizationsQueryVariables,
  UpdateAuthorizationMutationResult,
  UpdateAuthorizationMutationVariables,
} from '../graphql/operations';
import { UnknownTokenException } from '../exception/UnknownTokenException';
import { AdditionalInfoType } from '@citrineos/base/dist/ocpp/model/2.0.1';
import { MissingParamException } from '../exception/MissingParamException';
import {
  RealTimeAuthorizationRequestBody,
  RealTimeAuthorizationResponse,
} from '@citrineos/util';
import { TokensClientApi } from '../trigger/TokensClientApi';
import { InvalidParamException } from '../exception/InvalidParamException';
import { GET_TENANT_PARTNER_BY_ID } from '../graphql/queries/tenantPartner.queries';
import { GET_CHARGING_STATION_BY_ID_QUERY } from '../graphql/queries/chargingStation.queries';
import { LocationReferences } from '../model/LocationReferences';
import { UID_FORMAT } from '../model/DTO/EvseDTO';
import { OcpiResponseStatusCode } from '../model/OcpiResponse';

@Service()
export class TokensService {
  constructor(
    private readonly logger: OcpiLogger,
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
    private readonly tokensClientApi: TokensClientApi,
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

  async upsertToken(
    token: TokenDTO,
    tenantId: number,
    tenantPartnerId: number,
  ): Promise<TokenDTO> {
    const authorization =
      TokensMapper.mapOcpiTokenToPartialOcppAuthorization(token);

    const existingAuth = await this.ocpiGraphqlClient.request<
      GetAuthorizationByTokenQueryResult,
      GetAuthorizationByTokenQueryVariables
    >(GET_AUTHORIZATION_BY_TOKEN, {
      idToken: authorization.idToken!,
      idTokenType: authorization.idTokenType!,
      tenantPartnerId,
    });

    let groupAuthorizationId: number | undefined;
    if (token.group_id) {
      groupAuthorizationId = await this.handleGroupAuthorization(
        token.group_id,
        tenantId,
        tenantPartnerId,
      );
    }

    if (existingAuth.Authorizations.length > 0) {
      const result = await this.ocpiGraphqlClient.request<
        UpdateAuthorizationMutationResult,
        UpdateAuthorizationMutationVariables
      >(UPDATE_TOKEN_MUTATION, {
        idToken: authorization.idToken!,
        type: authorization.idTokenType!,
        tenantPartnerId,
        set: {
          additionalInfo: authorization.additionalInfo,
          status: authorization.status!,
          language1: authorization.language1,
          groupAuthorizationId,
          realTimeAuth: authorization.realTimeAuth,
          updatedAt: token.last_updated,
        },
      });

      return TokensMapper.toDto(
        result.update_Authorizations?.returning[0] as IAuthorizationDto,
      );
    } else {
      const timestamp = token.last_updated;
      const result = await this.ocpiGraphqlClient.request<
        CreateAuthorizationMutationResult,
        CreateAuthorizationMutationVariables
      >(CREATE_AUTHORIZATION_MUTATION, {
        tenantId,
        tenantPartnerId,
        idToken: authorization.idToken!,
        idTokenType: authorization.idTokenType!,
        additionalInfo: authorization.additionalInfo,
        status: authorization.status!,
        language1: authorization.language1,
        groupAuthorizationId,
        realTimeAuth: authorization.realTimeAuth,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      return TokensMapper.toDto(
        result.insert_Authorizations_one as IAuthorizationDto,
      );
    }
  }

  async patchToken(
    tokenUid: string,
    type: TokenType,
    token: Partial<TokenDTO>,
    tenantId: number,
    tenantPartnerId: number,
  ): Promise<TokenDTO> {
    if (!token.last_updated)
      throw new MissingParamException(
        `Tokens PATCH must contain last_updated.`,
      );
    const idTokenType = TokensMapper.mapOcpiTokenTypeToOcppIdTokenType(type);
    const authorization =
      TokensMapper.mapOcpiTokenToPartialOcppAuthorization(token);

    const existingAuth = await this.ocpiGraphqlClient.request<
      GetAuthorizationByTokenQueryResult,
      GetAuthorizationByTokenQueryVariables
    >(GET_AUTHORIZATION_BY_TOKEN, {
      idToken: tokenUid,
      idTokenType,
      tenantPartnerId,
    });

    if (existingAuth.Authorizations.length < 1) {
      throw new UnknownTokenException(`Unknown token ${tokenUid}:${type}`);
    }
    const set: Authorizations_Set_Input = {
      updatedAt: token.last_updated,
    };
    if (authorization.additionalInfo) {
      if (existingAuth.Authorizations[0].additionalInfo) {
        set.additionalInfo = this.mergeAdditionalInfo(
          authorization.additionalInfo,
          existingAuth.Authorizations[0].additionalInfo,
        );
      } else {
        set.additionalInfo = authorization.additionalInfo;
      }
    }
    if (authorization.status) set.status = authorization.status;
    if (authorization.language1) set.language1 = authorization.language1;
    if (token.group_id) {
      set.groupAuthorizationId = await this.handleGroupAuthorization(
        token.group_id,
        tenantId,
        tenantPartnerId,
      );
    }
    if (authorization.realTimeAuth !== undefined)
      set.realTimeAuth = authorization.realTimeAuth;

    const updateVariables = {
      idToken: tokenUid,
      type: idTokenType,
      tenantPartnerId,
      set,
    };
    const result = await this.ocpiGraphqlClient.request<
      UpdateAuthorizationMutationResult,
      UpdateAuthorizationMutationVariables
    >(UPDATE_TOKEN_MUTATION, updateVariables);
    return TokensMapper.toDto(
      result.update_Authorizations?.returning[0] as IAuthorizationDto,
    );
  }

  async realTimeAuthorization(
    realTimeAuthRequest: RealTimeAuthorizationRequestBody,
  ): Promise<RealTimeAuthorizationResponse> {
    const tenantPartnerResponse = await this.ocpiGraphqlClient.request<
      GetTenantPartnerByIdQueryResult,
      GetTenantPartnerByIdQueryVariables
    >(GET_TENANT_PARTNER_BY_ID, { id: realTimeAuthRequest.tenantPartnerId });
    if (!tenantPartnerResponse.TenantPartners_by_pk) {
      throw new InvalidParamException(
        `Unknown tenant partner ${realTimeAuthRequest.tenantPartnerId}`,
      );
    }

    let locationReferences: LocationReferences | undefined;
    if (realTimeAuthRequest.locationId && realTimeAuthRequest.stationId) {
      const chargingStationResponse = await this.ocpiGraphqlClient.request<
        GetChargingStationByIdQueryResult,
        GetChargingStationByIdQueryVariables
      >(GET_CHARGING_STATION_BY_ID_QUERY, {
        id: realTimeAuthRequest.stationId,
      });
      if (
        !chargingStationResponse.ChargingStations[0] ||
        realTimeAuthRequest.locationId !==
          chargingStationResponse.ChargingStations[0].locationId?.toString()
      ) {
        throw new InvalidParamException(
          `Unknown charging station ${realTimeAuthRequest.stationId} at location ${realTimeAuthRequest.locationId}`,
        );
      }
      const chargingStation = chargingStationResponse
        .ChargingStations[0] as IChargingStationDto;
      locationReferences = {
        location_id: realTimeAuthRequest.locationId.toString(),
        evse_uids: chargingStation.evses!.map((evse) =>
          UID_FORMAT(chargingStation.id, evse.id!),
        ),
      };
    }

    const tenantPartner = tenantPartnerResponse.TenantPartners_by_pk;
    this.logger.info('getting real time auth response');
    const postTokenResult = await this.tokensClientApi.postToken(
      tenantPartner.tenant.countryCode!,
      tenantPartner.tenant.partyId!,
      tenantPartner.countryCode!,
      tenantPartner.partyId!,
      tenantPartner.partnerProfileOCPI!,
      realTimeAuthRequest.idToken,
      TokensMapper.mapOcppIdTokenTypeToOcpiTokenType(
        realTimeAuthRequest.idTokenType,
      ),
      locationReferences,
    );
    this.logger.debug(`Real Time Auth response`, postTokenResult.data?.allowed);

    if (
      postTokenResult.status_code !== OcpiResponseStatusCode.GenericSuccessCode
    ) {
      throw new InvalidParamException(
        `Failed to authorize token ${realTimeAuthRequest.idToken}`,
      );
    }

    return {
      timestamp: postTokenResult.timestamp.toISOString(),
      data: {
        allowed: postTokenResult.data!.allowed,
        reason: postTokenResult.data!.info?.text,
      },
    };
  }

  private async handleGroupAuthorization(
    groupId: string,
    tenantId: number,
    tenantPartnerId: number,
  ): Promise<number> {
    // Check if group authorization already exists
    const existingGroupAuth = await this.ocpiGraphqlClient.request<
      GetGroupAuthorizationQueryResult,
      GetGroupAuthorizationQueryVariables
    >(GET_GROUP_AUTHORIZATION, {
      groupId,
      tenantPartnerId,
    });

    if (existingGroupAuth.Authorizations.length > 0) {
      return existingGroupAuth.Authorizations[0].id;
    }

    // Create new group authorization
    const timestamp = new Date().toISOString();
    const groupAuthResult = await this.ocpiGraphqlClient.request<
      CreateAuthorizationMutationResult,
      CreateAuthorizationMutationVariables
    >(CREATE_AUTHORIZATION_MUTATION, {
      tenantId,
      tenantPartnerId,
      idToken: groupId,
      idTokenType: IdTokenType.Central,
      additionalInfo: undefined,
      status: AuthorizationStatusType.Invalid,
      language1: undefined,
      groupAuthorizationId: undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return groupAuthResult.insert_Authorizations_one!.id;
  }

  private mergeAdditionalInfo(
    newPartialAdditionalInfo: [AdditionalInfoType, ...AdditionalInfoType[]],
    oldCompleteAdditionalInfo: [AdditionalInfoType, ...AdditionalInfoType[]],
  ): [AdditionalInfoType, ...AdditionalInfoType[]] {
    const mergedAdditionalInfo = oldCompleteAdditionalInfo.map((value) => {
      const updatedAdditionalInfo = newPartialAdditionalInfo.find(
        (updatedValue) => updatedValue.type === value.type,
      );
      if (updatedAdditionalInfo) {
        value.additionalIdToken = updatedAdditionalInfo.additionalIdToken;
      }
      return value;
    });
    return mergedAdditionalInfo as [
      AdditionalInfoType,
      ...AdditionalInfoType[],
    ];
  }
}
