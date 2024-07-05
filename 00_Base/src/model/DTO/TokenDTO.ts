import { Enum } from '../../util/decorators/enum';
import { TokenType } from '../TokenType';
import { Optional } from '../../util/decorators/optional';
import { WhitelistType } from '../WhitelistType';
import { TokenEnergyContract } from '../TokenEnergyContract';
import { OCPIToken } from '../OCPIToken';
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

  toToken(): OCPIToken {
    const token = new OCPIToken();
    token.id = undefined;
    token.country_code = this.country_code;
    token.party_id = this.party_id;
    token.uid = this.uid;
    token.type = this.type;
    token.contract_id = this.contract_id;
    token.visual_number = this.visual_number;
    token.issuer = this.issuer;
    token.group_id = this.group_id;
    token.valid = this.valid;
    token.whitelist = this.whitelist;
    token.language = this.language;
    token.default_profile_type = this.default_profile_type;
    token.energy_contract = this.energy_contract;
    token.last_updated = this.last_updated;
    return token;
  }
}
