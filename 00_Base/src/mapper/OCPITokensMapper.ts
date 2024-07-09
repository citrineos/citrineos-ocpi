import {
  AuthorizationStatusEnumType,
  IdTokenEnumType,
  IdTokenInfoType,
  IdTokenType,
} from '@citrineos/base';
import { OCPIToken, SingleTokenRequest } from '../model/OCPIToken';
import { TokenType } from '../model/TokenType';
import { Authorization, IdToken, IdTokenInfo } from '@citrineos/data';
import { TokenDTO } from '../model/DTO/TokenDTO';

export class OCPITokensMapper {
  public static toEntity(id: string, tokenDto: TokenDTO): OCPIToken {
    return OCPIToken.build({
      id: id,
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
    token: OCPIToken,
  ): Promise<TokenDTO> {
    const tokenDto = new TokenDTO();

    tokenDto.country_code = token.country_code;
    tokenDto.party_id = token.party_id;
    tokenDto.uid = (await authorization.$get('idToken'))!.idToken;
    tokenDto.type = token.type;
    tokenDto.contract_id = token.contract_id;
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
      case TokenType.APP_USER:
      case TokenType.OTHER:
        return IdTokenEnumType.Central;
      default:
        throw new Error(`Unknown token type: ${type}`);
    }
  }

  public static mapOcpiTokenToOcppAuthorization(
    tokenDto: TokenDTO,
  ): Authorization {
    let groupId: IdTokenType | undefined;
    if (tokenDto.group_id) {
      groupId = {
        idToken: tokenDto.group_id,
        type: OCPITokensMapper.mapOcpiTokenTypeToOcppIdTokenType(tokenDto.type),
      };
    }

    const idToken = {
      idToken: tokenDto.uid,
      type: OCPITokensMapper.mapOcpiTokenTypeToOcppIdTokenType(tokenDto.type),
      additionalInfo: [
        {
          additionalIdToken: tokenDto.contract_id,
          type: OCPITokensMapper.mapOcpiTokenTypeToOcppIdTokenType(
            tokenDto.type,
          ),
        },
      ],
    };

    const idTokenInfo: IdTokenInfoType = {
      status: tokenDto.valid
        ? AuthorizationStatusEnumType.Accepted
        : AuthorizationStatusEnumType.Invalid,
      groupIdToken: groupId,
      language1: tokenDto.language ?? undefined,
    };

    const authBody = {
      idToken: idToken,
      idTokenInfo: idTokenInfo,
    };

    return Authorization.build(authBody, {
      include: [IdToken, IdTokenInfo],
    });
  }
}
