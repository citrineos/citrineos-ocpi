import { AuthorizationStatusEnumType, IdTokenEnumType, IdTokenType, IdTokenInfoType } from '@citrineos/base';
import { SingleTokenRequest, OCPIToken } from '../model/OCPIToken';
import { TokenType } from '../model/TokenType';
import { Authorization } from '@citrineos/data';
import { TokenDTO } from '../model/DTO/TokenDTO';

export class OCPITokensMapper {

  /** TODO: Make this config based or at least an interface
   *
   * @private
   * @param token
   */
  public static mapTokenTypeToIdTokenType(token: Partial<OCPIToken>): IdTokenEnumType {
    switch (token.type) {
      case TokenType.RFID:
        //If you are actually using ISO15693, you need to change this
        return IdTokenEnumType.ISO14443;
      case TokenType.APP_USER:
      case TokenType.OTHER:
        return IdTokenEnumType.Central;
      default:
        throw new Error(`Unknown token type: ${token.type}`);
    }
  }

  public static mapSingleTokenRequestToIdTokenType(tokenRequest: SingleTokenRequest): IdTokenEnumType {
    switch (tokenRequest.type) {
      case TokenType.RFID:
        //If you are actually using ISO15693, you need to change this
        return IdTokenEnumType.ISO14443;
      case TokenType.APP_USER:
      case TokenType.OTHER:
        return IdTokenEnumType.Central;
      default:
        throw new Error(`Unknown token type: ${tokenRequest.type}`);
    }
  }

  public static mapOcpiTokenToOcppAuthorization(ocpiToken: OCPIToken): Authorization {

    // Map the token's group_id if present
    let groupId: IdTokenType | undefined = undefined;
    if (ocpiToken.group_id) {
      groupId = {
        idToken: ocpiToken.group_id,
        type: OCPITokensMapper.mapTokenTypeToIdTokenType(ocpiToken),
      };
    }

    // Create the IdToken object
    const idToken: IdTokenType = {
      idToken: ocpiToken.uid,
      type: OCPITokensMapper.mapTokenTypeToIdTokenType(ocpiToken),
      additionalInfo: [{ additionalIdToken: ocpiToken.contract_id, type: 'ContractId' }],
    };

    // Create the IdTokenInfo object
    const idTokenInfo: IdTokenInfoType = {
      status: ocpiToken.valid ? AuthorizationStatusEnumType.Accepted : AuthorizationStatusEnumType.Invalid,
      groupIdToken: groupId,
      language1: ocpiToken.language ?? undefined,
    };

    // Create the Authorization object
    const auth = new Authorization();
    auth.id = undefined;
    auth.idToken = idToken;
    auth.idTokenInfo = idTokenInfo;


    return auth;
  }

  public static mapTokenDtoToToken(tokenDto: TokenDTO) {
    const token = new OCPIToken();
    token.id = undefined;
    token.country_code = tokenDto.country_code;
    token.party_id = tokenDto.party_id;
    token.uid = tokenDto.uid;
    token.type = tokenDto.type;
    token.contract_id = tokenDto.contract_id;
    token.visual_number = tokenDto.visual_number;
    token.issuer = tokenDto.issuer;
    token.group_id = tokenDto.group_id;
    token.valid = tokenDto.valid;
    token.whitelist = tokenDto.whitelist;
    token.language = tokenDto.language;
    token.default_profile_type = tokenDto.default_profile_type;
    token.energy_contract = tokenDto.energy_contract;
    token.last_updated = tokenDto.last_updated;
    return token;
  }

}