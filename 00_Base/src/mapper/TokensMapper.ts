import {
  AdditionalInfo,
  AuthorizationStatusEnumType,
  IAuthorizationDto,
  IdTokenType,
  OCPP2_0_1,
  RealTimeAuthEnumType,
} from '@citrineos/base';
import { TokenType } from '../model/TokenType';

import { TokenDTO } from '../model/DTO/TokenDTO';
import { WhitelistType } from '../model/WhitelistType';

export class TokensMapper {
  public static toDto(authorization: IAuthorizationDto): TokenDTO {
    const tokenDto = new TokenDTO();

    tokenDto.country_code = authorization.tenant!.countryCode!;
    tokenDto.party_id = authorization.tenant!.partyId!;
    tokenDto.uid = authorization.idToken;
    tokenDto.type = TokensMapper.mapOcppIdTokenTypeToOcpiTokenType(
      authorization.idTokenType ? authorization.idTokenType : null,
    );
    tokenDto.contract_id = this.getContractId(authorization);
    tokenDto.visual_number = TokensMapper.getVisualNumber(authorization);
    tokenDto.issuer = TokensMapper.getIssuer(authorization);
    tokenDto.group_id = authorization.groupAuthorization?.idToken;
    tokenDto.valid =
      authorization.status === OCPP2_0_1.AuthorizationStatusEnumType.Accepted;
    tokenDto.whitelist = TokensMapper.mapRealTimeEnumType(
      authorization.realTimeAuth,
    );
    tokenDto.language = authorization.language1;
    // tokenDto.default_profile_type = token.default_profile_type;
    // tokenDto.energy_contract = token.energy_contract;
    tokenDto.last_updated = authorization.updatedAt!;

    return tokenDto;
  }

  public static mapOcpiTokenTypeToOcppIdTokenType(
    type: TokenType,
  ): IdTokenType {
    switch (type) {
      case TokenType.RFID:
        // If you are actually using ISO15693, you need to change this
        return IdTokenType.ISO14443;
      case TokenType.AD_HOC_USER:
        return IdTokenType.Local;
      case TokenType.APP_USER:
        return IdTokenType.Central;
      case TokenType.OTHER:
        return IdTokenType.Other;
      default:
        throw new Error(`Unknown token type: ${type}`);
    }
  }

  public static mapOcppIdTokenTypeToOcpiTokenType(
    type: IdTokenType | null | undefined,
  ): TokenType {
    switch (type) {
      case IdTokenType.ISO14443:
        // If you are actually using ISO15693, you need to change this
        return TokenType.RFID;
      case IdTokenType.Local:
        return TokenType.AD_HOC_USER;
      case IdTokenType.Central:
        return TokenType.APP_USER;
      case null:
        return TokenType.OTHER;
      default:
        throw new Error(`Unknown token type: ${type}`);
    }
  }

  public static mapRealTimeEnumType(
    type: RealTimeAuthEnumType | null | undefined,
  ): WhitelistType {
    switch (type) {
      case RealTimeAuthEnumType.Allowed:
        return WhitelistType.ALLOWED;
      case RealTimeAuthEnumType.AllowedOffline:
        return WhitelistType.ALLOWED_OFFLINE;
      case RealTimeAuthEnumType.Never:
        return WhitelistType.NEVER;
      default:
        return WhitelistType.ALWAYS;
    }
  }

  public static mapOcpiTokenToOcppAuthorization(
    tokenDto: TokenDTO,
  ): IAuthorizationDto {
    const tenantId = 0; // TODO: Handle linking to tenant with tokenDto.country_code and tokenDto.party_id

    const idToken: string = tokenDto.uid;
    const idTokenType: IdTokenType | null =
      TokensMapper.mapOcpiTokenTypeToOcppIdTokenType(tokenDto.type);
    const additionalInfo: [
      OCPP2_0_1.AdditionalInfoType,
      ...OCPP2_0_1.AdditionalInfoType[],
    ] = [
      {
        additionalIdToken: tokenDto.contract_id,
        type: OCPP2_0_1.IdTokenEnumType.eMAID,
      },
    ];
    if (tokenDto.visual_number) {
      additionalInfo.push({
        additionalIdToken: tokenDto.visual_number,
        type: 'visual_number',
      });
    }
    if (tokenDto.issuer) {
      additionalInfo.push({
        additionalIdToken: tokenDto.issuer,
        type: 'issuer',
      });
    }

    const status: OCPP2_0_1.AuthorizationStatusEnumType = tokenDto.valid
      ? OCPP2_0_1.AuthorizationStatusEnumType.Accepted
      : OCPP2_0_1.AuthorizationStatusEnumType.Invalid;
    const language1: string | undefined = tokenDto.language ?? undefined;

    if (tokenDto.group_id) {
      // TODO: Handle linking to group authorization with tokenDto.group_id
    }

    return {
      tenantId,
      additionalInfo,
      idToken,
      idTokenType,
      status,
      language1,
    };
  }

  public static getContractId(authorization: IAuthorizationDto): string {
    const contractId = authorization.additionalInfo!.find(
      (info) => info.type === OCPP2_0_1.IdTokenEnumType.eMAID,
    )?.additionalIdToken;
    if (!contractId) {
      throw new Error(
        'Contract ID not found in authorization additional info, authorization is incomplete for OCPI token mapping. Please add additional info with type eMAID.',
      );
    }
    return contractId;
  }

  public static getVisualNumber(authorization: IAuthorizationDto): string {
    const visualNumber = authorization.additionalInfo!.find(
      (info) => info.type === 'visual_number',
    )?.additionalIdToken;
    if (!visualNumber) {
      throw new Error(
        'Visual number not found in authorization additional info, authorization is incomplete for OCPI token mapping. Please add additional info with type visual_number.',
      );
    }
    return visualNumber;
  }

  public static getIssuer(authorization: IAuthorizationDto): string {
    const issuer = authorization.additionalInfo!.find(
      (info) => info.type === 'issuer',
    )?.additionalIdToken;
    if (!issuer) {
      throw new Error(
        'Issuer not found in authorization additional info, authorization is incomplete for OCPI token mapping. Please add additional info with type issuer.',
      );
    }
    return issuer;
  }

  // public static mapTokenDTOToPartialAuthorization(
  //   existingAuth: Authorization,
  //   tokenDTO: Partial<TokenDTO>,
  // ): Partial<OCPP2_0_1.IdTokenInfoType> {
  //   const idTokenInfo: Partial<OCPP2_0_1.IdTokenInfoType> = {
  //     status: existingAuth.idTokenInfo?.status,
  //   };

  //   if (tokenDTO.valid !== undefined) {
  //     idTokenInfo.status = tokenDTO.valid
  //       ? OCPP2_0_1.AuthorizationStatusEnumType.Accepted
  //       : OCPP2_0_1.AuthorizationStatusEnumType.Invalid;
  //   }

  //   if (tokenDTO.group_id) {
  //     idTokenInfo.groupIdToken = {
  //       idToken: tokenDTO.group_id,
  //       type: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(
  //         tokenDTO.type!,
  //       ),
  //     };
  //   }

  //   if (tokenDTO.language) {
  //     idTokenInfo.language1 = tokenDTO.language;
  //   }

  //   return idTokenInfo;
  // }

  public static toGraphqlWhere(token: TokenDTO): any {
    return {
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
  }

  public static toGraphqlSet(token: Partial<TokenDTO>): any {
    const set: any = {};
    if (token.valid !== undefined) {
      set.IdTokenInfo = {
        status: token.valid
          ? AuthorizationStatusEnumType.Accepted
          : AuthorizationStatusEnumType.Invalid,
      };
    }
    //TODO: Add other fields as needed for update
    return set;
  }
}
