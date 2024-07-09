import { InvalidParamException } from '../../exception/invalid.param.exception';
import { TokenDTO } from '../../model/DTO/TokenDTO';

export class TokensValidators {
  public static validatePartialTokenForUniquenessRequiredFields(
    partialToken: TokenDTO,
  ) {
    if (partialToken.uid === undefined) {
      throw new InvalidParamException('uid is required');
    }
    if (partialToken.party_id === undefined) {
      throw new InvalidParamException('party_id is required');
    }
    if (partialToken.country_code === undefined) {
      throw new InvalidParamException('country_code is required');
    }
  }
}
