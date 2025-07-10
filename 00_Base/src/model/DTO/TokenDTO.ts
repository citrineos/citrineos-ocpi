import { Enum } from '../../util/decorators/Enum';
import { TokenType } from '../TokenType';
import { Optional } from '../../util/decorators/Optional';
import { WhitelistType } from '../WhitelistType';
import { TokenEnergyContract } from '../TokenEnergyContract';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TokenDTO {
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

  @Enum(TokenType, 'TokenType')
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
  language?: string | null | undefined;

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
