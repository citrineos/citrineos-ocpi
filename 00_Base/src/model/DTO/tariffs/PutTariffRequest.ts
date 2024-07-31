import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Optional } from '../../../util/decorators/optional';
import { TariffType } from '../../TariffType';
import { Type } from 'class-transformer';
import { DisplayText } from '../../DisplayText';
import { Price } from '../../Price';
import { TariffElement } from '../../TariffElement';
import { EnergyMix } from '../../EnergyMix';

export class PutTariffRequest {
  @MaxLength(36)
  @IsString()
  @IsNotEmpty()
  id!: string;

  @MaxLength(2)
  @MinLength(2)
  @IsString()
  @IsNotEmpty()
  country_code!: string;

  @MaxLength(3)
  @IsString()
  @IsNotEmpty()
  party_id!: string;

  @MaxLength(3)
  @MinLength(3)
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsString()
  @Optional()
  type?: TariffType | null;

  @IsArray()
  @Optional()
  @Type(() => DisplayText)
  @ValidateNested({ each: true })
  tariff_alt_text?: DisplayText[] | null;

  @IsString()
  @IsUrl({ require_tld: false })
  @Optional()
  tariff_alt_url?: string | null;

  @Optional()
  @Type(() => Price)
  @ValidateNested()
  min_price?: Price | null;

  @Optional()
  @Type(() => Price)
  @ValidateNested()
  max_price?: Price | null;

  @ArrayMinSize(1)
  @IsArray()
  @IsNotEmpty()
  @Type(() => TariffElement)
  @ValidateNested({ each: true })
  elements!: TariffElement[];

  @Optional()
  @Type(() => EnergyMix)
  @ValidateNested()
  energy_mix?: EnergyMix | null;

  @IsString()
  @IsDateString()
  @Optional()
  @Type(() => Date)
  start_date_time?: Date | null;

  @IsString()
  @IsDateString()
  @Optional()
  @Type(() => Date)
  end_date_time?: Date | null;
}
