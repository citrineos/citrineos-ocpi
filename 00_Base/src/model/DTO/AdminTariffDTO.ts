import {
  ArrayMinSize,
  IsArray, IsDateString,
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Optional } from '../../util/decorators/optional';
import { TariffType } from '../TariffType';
import { Type } from 'class-transformer';
import { DisplayText } from '../DisplayText';
import { Price } from '../Price';
import { TariffElement } from '../TariffElement';
import { EnergyMix } from '../EnergyMix';

export class AdminTariffDTO {
  declare id: number;
  declare country_code: string;
  declare party_id: string;
  declare station_id: string;
  declare currency: string;
  declare type: TariffType;
  declare tariff_alt_text: DisplayText[];
  declare tariff_alt_url: string;
  declare min_price: Price;
  declare max_price: Price;
  declare elements: TariffElement[];
  declare energy_mix: EnergyMix;
  declare start_date_time: Date;
  declare end_date_time: Date;
  declare last_updated: Date;

  // TODO add helper to validate required fields for create
  // TODO add helper to validat required fields for update
}