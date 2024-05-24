import {OcpiParams} from '../../util/ocpi.params';
import {TokenType} from '../../../model/TokenType';
import {IsNotEmpty, IsString, Length} from 'class-validator';
import {Enum} from '../../../util/decorators/enum';

export class GetTokenParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  tokenId!: string;

  @Enum(TokenType, 'TokenType')
  @IsNotEmpty()
  type?: TokenType;
}
