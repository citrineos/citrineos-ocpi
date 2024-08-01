import {
  AdditionalInfoType,
  AuthorizationData,
  AuthorizationStatusEnumType,
  IdTokenEnumType,
  IdTokenInfoType,
  IdTokenType,
} from '@citrineos/base';
import { OcpiToken } from '../model/OcpiToken';
import { TokenType } from '../model/TokenType';
import { Authorization, IdToken } from '@citrineos/data';
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
    authorization: Authorization,
    token: OcpiToken,
  ): Promise<TokenDTO> {
    const tokenDto = new TokenDTO();

    tokenDto.country_code = token.country_code;
    tokenDto.party_id = token.party_id;
    tokenDto.uid = (await authorization.$get('idToken'))!.idToken;
    tokenDto.type = token.type;
    tokenDto.contract_id = await this.getContractId(authorization);
    tokenDto.visual_number = token.visual_number;
    tokenDto.issuer = token.issuer;
    tokenDto.group_id = authorization.idTokenInfo?.groupIdToken?.idToken;
    tokenDto.valid =
      authorization.idTokenInfo?.status ===
      AuthorizationStatusEnumType.Accepted;
    tokenDto.whitelist = token.whitelist;
    tokenDto.language = authorization.idTokenInfo?.language1;
    tokenDto.default_profile_type = token.default_profile_type;
    tokenDto.energy_contract = token.energy_contract;
    tokenDto.last_updated = token.last_updated;

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
    authorization: Authorization,
  ): Promise<string> {
    const idToken = await authorization.$get('idToken');
    const additionalInfo = await (idToken! as IdToken).$get('additionalInfo');

    // TODO: filter by type eMAID
    return additionalInfo![0].additionalIdToken;
  }

  public static mapTokenDTOToPartialAuthorization(
    existingAuth: Authorization,
    tokenDTO: Partial<TokenDTO>,
  ): Partial<IdTokenInfoType> {
    const idTokenInfo: Partial<IdTokenInfoType> = {
      status: existingAuth.idTokenInfo?.status,
    };

    if (tokenDTO.valid !== undefined) {
      idTokenInfo.status = tokenDTO.valid
        ? AuthorizationStatusEnumType.Accepted
        : AuthorizationStatusEnumType.Invalid;
    }

    if (tokenDTO.group_id) {
      idTokenInfo.groupIdToken = {
        idToken: tokenDTO.group_id,
        type: OcpiTokensMapper.mapOcpiTokenTypeToOcppIdTokenType(
          tokenDTO.type!,
        ),
      };
    }

    if (tokenDTO.language) {
      idTokenInfo.language1 = tokenDTO.language;
    }

    return idTokenInfo;
  }
}
