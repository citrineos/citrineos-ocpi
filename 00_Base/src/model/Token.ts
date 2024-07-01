import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TokenEnergyContract } from './TokenEnergyContract';
import { WhitelistType } from './WhitelistType';
import { Type } from 'class-transformer';
import { Optional } from '../util/decorators/optional';
import { Enum } from '../util/decorators/enum';
import { OcpiResponse } from './ocpi.response';
import { PaginatedResponse } from './PaginatedResponse';
import { TokenType } from './TokenType';

export class Token {
  @MaxLength(2)
  @MinLength(2)
  @IsString()
  @IsNotEmpty()
  country_code!: string;

  @MaxLength(3)
  @IsString()
  @IsNotEmpty()
  party_id!: string;

  @MaxLength(36)
  @IsString()
  @IsNotEmpty()
  uid!: string;

  @IsString()
  @IsNotEmpty()
  type!: TokenType;

  @MaxLength(36)
  @IsString()
  @IsNotEmpty()
  contract_id!: string;

  @MaxLength(64)
  @IsString()
  @Optional()
  visual_number?: string | null;

  @MaxLength(64)
  @IsString()
  @IsNotEmpty()
  issuer!: string;

  @MaxLength(36)
  @IsString()
  @Optional()
  group_id?: string | null;

  @IsBoolean()
  @IsNotEmpty()
  valid!: boolean;

  @Enum(WhitelistType, 'WhitelistType')
  @IsNotEmpty()
  whitelist!: WhitelistType;

  @MaxLength(2)
  @MinLength(2)
  @IsString()
  @Optional()
  language?: string | null;

  @IsString()
  @Optional()
  default_profile_type?: string | null;

  @Optional()
  @Type(() => TokenEnergyContract)
  @ValidateNested()
  energy_contract?: TokenEnergyContract | null;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  last_updated!: Date;
}

export class TokenResponse extends OcpiResponse<Token> {
  @IsObject()
  @IsNotEmpty()
  @Type(() => Token)
  @ValidateNested()
  data!: Token;
}

export class PaginatedTokenResponse extends PaginatedResponse<Token> {
  @IsArray()
  @ValidateNested({ each: true })
  @IsNotEmpty()
  @Optional(false)
  @Type(() => Token)
  data!: Token[];
}
