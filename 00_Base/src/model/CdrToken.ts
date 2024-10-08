import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TokenType } from './TokenType';
import { Optional } from '../util/decorators/Optional';
import { Enum } from '../util/decorators/Enum';

export class CdrToken {
  @MaxLength(36)
  @IsString()
  @IsNotEmpty()
  uid!: string;

  @Enum(TokenType, 'TokenType')
  @Optional()
  type?: TokenType | null;

  @MaxLength(36)
  @IsString()
  @IsNotEmpty()
  contract_id!: string;

  @MaxLength(2)
  @IsString()
  @IsNotEmpty()
  country_code!: string;

  @MaxLength(3)
  @IsString()
  @IsNotEmpty()
  party_id!: string;
}
