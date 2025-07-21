
import {
  IdTokenType,
  IAuthorizationDto,
  OCPP2_0_1,
} from '@citrineos/base';
import { TokenType } from '../model/TokenType';
import { TokenDTO } from '../model/DTO/TokenDTO';

export class OcpiTokensMapper {
  public static async toDto(
    authorization: IAuthorizationDto,
  ): Promise<TokenDTO> {
    const tokenDto = new TokenDTO();

    tokenDto.country_code = authorization.tenant!.countryCode!;
    tokenDto.party_id = authorization.tenant!.partyId!;
    tokenDto.uid = authorization.idToken;
    tokenDto.type = OcpiTokensMapper.mapOcppIdTokenTypeToOcpiTokenType(
      authorization.idTokenType ? authorization.idTokenType : null,
    );
    tokenDto.contract_id = await this.getContractId(authorization);
    // tokenDto.visual_number = token.visual_number; add to additionalInfo
    // tokenDto.issuer = token.issuer; add to additionalInfo
    tokenDto.group_id = authorization.groupAuthorization?.idToken;
    tokenDto.valid =
      authorization.status === OCPP2_0_1.AuthorizationStatusEnumType.Accepted;
    // tokenDto.whitelist = token.whitelist; realtimeauth enum
    tokenDto.language = authorization.language1;
    // tokenDto.default_profile_type = token.default_profile_type;
    // tokenDto.energy_contract = token.energy_contract;
    tokenDto.last_updated = authorization.updatedAt!;

    return tokenDto;
  }

  public static mapOcpiTokenTypeToOcppIdTokenType(
    type: TokenType,
  ): IdTokenType | null {
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
    type: IdTokenType | null,
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

  public static mapOcpiTokenToOcppAuthorization(
    tokenDto: TokenDTO,
  ): IAuthorizationDto {
    const tenantId = 0; // TODO: Handle linking to tenant with tokenDto.country_code and tokenDto.party_id

    const idToken: string = tokenDto.uid;
    const idTokenType: IdTokenType | null =
      OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(tokenDto.type);
    const additionalInfo: [OCPP2_0_1.AdditionalInfoType, ...OCPP2_0_1.AdditionalInfoType[]] = [{
      additionalIdToken: tokenDto.contract_id,
      type: OCPP2_0_1.IdTokenEnumType.eMAID,
    }];
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

  public static async getContractId(
    authorization: IAuthorizationDto,
  ): Promise<string> {
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

  public static fromGraphql(graphqlAuth: any): TokenDTO {
    const idTokenInfo = graphqlAuth.IdTokenInfo;
    const idToken = graphqlAuth.IdToken;
    const tenant = graphqlAuth.Tenant;

    return {
      uid: idToken.idToken,
      type: idToken.type,
      country_code: tenant.countryCode,
      party_id: tenant.partyId,
      valid: idTokenInfo.status === AuthorizationStatusEnumType.Accepted,
      contract_id: graphqlAuth.OcpiToken?.contract_id,
      visual_number: graphqlAuth.OcpiToken?.visual_number,
      issuer: graphqlAuth.OcpiToken?.issuer,
      whitelist: graphqlAuth.OcpiToken?.whitelist,
      default_profile_type: graphqlAuth.OcpiToken?.default_profile_type,
      energy_contract: graphqlAuth.OcpiToken?.energy_contract,
      last_updated: graphqlAuth.OcpiToken?.last_updated,
    };
  }

  public static toGraphqlWhere(token: TokenDTO): any {
    return {
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
