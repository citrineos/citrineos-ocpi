import {
  AdditionalInfoType,
  AuthorizationData,
  AuthorizationStatusEnumType,
  IdTokenEnumType,
  IdTokenInfoType,
  IdTokenType,
  IAuthorizationDto,
} from '@citrineos/base';
import { OcpiToken } from '../model/OcpiToken';
import { TokenType } from '../model/TokenType';
import { TokenDTO } from '../model/DTO/TokenDTO';

export class OcpiTokensMapper {
  public static toEntity(
    authorizationId: number,
    tokenDto: TokenDTO,
  ): OcpiToken {
    return OcpiToken.build({
      authorization_id: authorizationId,
      country_code: tokenDto.country_code,
      party_id: tokenDto.party_id,
      uid: tokenDto.uid,
      type: tokenDto.type,
      contract_id: tokenDto.contract_id,
      visual_number: tokenDto.visual_number,
      issuer: tokenDto.issuer,
      whitelist: tokenDto.whitelist,
      default_profile_type: tokenDto.default_profile_type,
      energy_contract: tokenDto.energy_contract,
      last_updated: tokenDto.last_updated,
    });
  }

  public static async toDto(
    authorization: IAuthorizationDto,
  ): Promise<TokenDTO> {
    const tokenDto = new TokenDTO();
    tokenDto.country_code = authorization?.tenant?.countryCode ?? '';
    tokenDto.party_id = authorization.tenant?.partyId ?? '';
    tokenDto.uid = authorization.idToken;
    tokenDto.type = authorization.idTokenType as TokenType;
    tokenDto.contract_id = await this.getContractId(authorization);
    tokenDto.group_id = authorization.groupAuthorizationId?.toString();
    tokenDto.valid =
      authorization.additionalInfo?.status ===
      AuthorizationStatusEnumType.Accepted;
    tokenDto.language = authorization.language1;
    return tokenDto;
  }

  public static mapOcpiTokenTypeToOcppIdTokenType(
    type: TokenType,
  ): IdTokenEnumType {
    switch (type) {
      case TokenType.RFID:
        // If you are actually using ISO15693, you need to change this
        return IdTokenEnumType.ISO14443;
      case TokenType.AD_HOC_USER:
      case TokenType.APP_USER:
      case TokenType.OTHER:
        return IdTokenEnumType.Central;
      default:
        throw new Error(`Unknown token type: ${type}`);
    }
  }

  public static mapOcpiTokenToOcppAuthorization(
    tokenDto: TokenDTO,
  ): AuthorizationData {
    const additionalInfo: AdditionalInfoType = {
      additionalIdToken: tokenDto.contract_id,
      type: IdTokenEnumType.eMAID,
    };

    const idToken: IdTokenType = {
      idToken: tokenDto.uid,
      type: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(tokenDto.type),
      additionalInfo: [additionalInfo],
    };

    const idTokenInfo: IdTokenInfoType = {
      status: tokenDto.valid
        ? AuthorizationStatusEnumType.Accepted
        : AuthorizationStatusEnumType.Invalid,
      language1: tokenDto.language ?? undefined,
    };

    if (tokenDto.group_id) {
      idTokenInfo['groupIdToken'] = {
        idToken: tokenDto.group_id,
        type: IdTokenEnumType.Central,
      };
    }

    return { idToken, idTokenInfo };
  }

  public static async getContractId(
    authorization: IAuthorizationDto,
  ): Promise<string> {
    const additionalInfo = authorization.additionalInfo;

    // TODO: filter by type eMAID
    return additionalInfo![0].additionalIdToken;
  }
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
