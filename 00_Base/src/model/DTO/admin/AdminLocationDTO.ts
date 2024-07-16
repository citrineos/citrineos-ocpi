import { GeoLocation } from '../../GeoLocation';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Optional } from '../../../util/decorators/optional';
import { Type } from 'class-transformer';

// TODO add remaining OCPI-specific properties

export class AdminLocationDTO {
  // id is the Citrine Location database id, not the OcpiLocation's database id
  @IsNumber()
  @Optional()
  id?: number;

  @IsString()
  @MaxLength(2)
  @Optional()
  country_code!: string;

  @IsString()
  @MaxLength(3)
  @Optional()
  party_id!: string;

  @IsString()
  @Optional()
  name?: string;

  @IsString()
  @Optional()
  address?: string;

  @IsString()
  @Optional()
  city?: string;

  @IsString()
  @Optional()
  state?: string;

  @IsString()
  @Optional()
  postal_code?: string;

  @IsString()
  @Optional()
  country?: string;

  @IsObject()
  @Optional()
  @Type(() => GeoLocation)
  @ValidateNested()
  coordinates?: GeoLocation;

  @IsString()
  @Optional()
  time_zone?: string;

  @IsBoolean()
  @Optional()
  publish?: boolean;

  @IsBoolean()
  @Optional()
  push_to_msps?: boolean;

  @IsArray()
  @Optional()
  evses: AdminEVSEDTO[] | undefined;
}

export class AdminEVSEDTO {
  @IsString()
  @IsNotEmpty()
  station_id!: string;

  @IsNumber()
  @IsNotEmpty()
  id!: number;

  @IsString()
  @Optional()
  physical_reference?: string;

  @IsString()
  @Optional()
  removed?: boolean;

  @IsArray()
  @Optional()
  connectors: AdminConnectorDTO[] | undefined;
}

export class AdminConnectorDTO {
  @IsNumber()
  @IsNotEmpty()
  id!: number;
}