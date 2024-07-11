import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Optional } from '../../util/decorators/optional';
import { Type } from 'class-transformer';
import { PublishTokenType } from '../PublishTokenType';
import { GeoLocation } from '../GeoLocation';
import { AdditionalGeoLocation } from '../AdditionalGeoLocation';
import { EvseDTO } from './EvseDTO';
import { BusinessDetails } from '../BusinessDetails';
import { Facilities } from '../Facilities';
import { Hours } from '../Hours';
import { EnergyMix } from '../EnergyMix';
import { OcpiResponse } from '../ocpi.response';
import { PaginatedResponse } from '../PaginatedResponse';

export class  LocationDTO {
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
  id!: string;

  @IsBoolean()
  @IsNotEmpty()
  publish!: boolean;

  @IsArray()
  @Optional()
  @Type(() => PublishTokenType)
  @ValidateNested({ each: true })
  publish_allowed_to?: PublishTokenType[] | null;

  @MaxLength(255)
  @IsString()
  @Optional()
  name?: string | null;

  @MaxLength(45)
  @IsString()
  @IsNotEmpty()
  address!: string;

  @MaxLength(45)
  @IsString()
  @IsNotEmpty()
  city!: string;

  @MaxLength(10)
  @IsString()
  @Optional()
  postal_code?: string | null;

  @MaxLength(20)
  @IsString()
  @Optional()
  state?: string | null;

  @MaxLength(3)
  @MinLength(3)
  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsObject()
  @IsNotEmpty()
  @Type(() => GeoLocation)
  @ValidateNested()
  coordinates!: GeoLocation;

  @IsArray()
  @Optional()
  @Type(() => AdditionalGeoLocation)
  @ValidateNested({ each: true })
  related_locations?: AdditionalGeoLocation[] | null;

  @IsString()
  @Optional()
  parking_type?: string | null;

  @IsArray()
  @Optional()
  @Type(() => EvseDTO)
  @ValidateNested({ each: true })
  evses?: EvseDTO[] | null;

  @IsArray()
  @Optional()
  directions?: null;

  @Optional()
  @Type(() => BusinessDetails)
  @ValidateNested()
  operator?: BusinessDetails | null;

  @Optional()
  @Type(() => BusinessDetails)
  @ValidateNested()
  suboperator?: BusinessDetails | null;

  @Optional()
  owner?: BusinessDetails | null;

  @IsArray()
  @Optional()
  // @Type(() => Facilities) todo handle array of enum
  @ValidateNested({ each: true })
  facilities?: Facilities[] | null;

  @MaxLength(255)
  @IsString()
  @IsNotEmpty()
  time_zone!: string;

  @Optional()
  @Type(() => Hours)
  @ValidateNested()
  opening_times?: Hours | null;

  @Optional()
  charging_when_closed?: null;

  @IsArray()
  @Optional()
  images?: null;

  @Optional()
  @Type(() => EnergyMix)
  @ValidateNested()
  energy_mix?: EnergyMix | null;

  @IsString()
  @IsDateString()
  @IsNotEmpty()
  @Type(() => Date)
  last_updated!: Date;
}

export class LocationResponse extends OcpiResponse<LocationDTO> {
  @IsObject()
  @IsNotEmpty()
  @Type(() => LocationDTO)
  @ValidateNested()
  data?: LocationDTO | undefined;
}

export class PaginatedLocationResponse extends PaginatedResponse<LocationDTO> {
  @IsArray()
  @ValidateNested({ each: true })
  @IsNotEmpty()
  @Optional(false)
  @Type(() => LocationDTO)
  data!: LocationDTO[];
}
