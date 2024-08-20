import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginatedResponse } from '../../PaginatedResponse';
import { Optional } from '../../../util/decorators/optional';
import { Price } from '../../Price';
import { TariffElement } from '../../TariffElement';
import { EnergyMix } from '../../EnergyMix';
import { DisplayText } from '../../DisplayText';
import { TariffType } from '../../TariffType';
import { OcpiResponse, OcpiResponseStatusCode } from '../../ocpi.response';

export class TariffDTO {
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

  @IsString()
  @IsDateString()
  @IsNotEmpty()
  @Type(() => Date)
  last_updated!: Date;
}

export class PaginatedTariffResponse extends PaginatedResponse<TariffDTO> {
  @IsArray()
  @ValidateNested({ each: true })
  @IsNotEmpty()
  @Optional(false)
  @Type(() => TariffDTO)
  data!: TariffDTO[];
}

export class TariffResponse extends OcpiResponse<TariffDTO> {
  @IsObject()
  @IsNotEmpty()
  @Type(() => TariffDTO)
  @ValidateNested()
  data!: TariffDTO;

  static build(
    tariff: TariffDTO,
    status_code = OcpiResponseStatusCode.GenericSuccessCode,
    status_message?: string,
  ) {
    const response = new TariffResponse();
    response.data = new TariffDTO();
    response.status_code = status_code;
    response.status_message = status_message;
    response.data = tariff;
    response.timestamp = new Date();
    return response;
  }
}
