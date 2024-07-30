import { GeoLocation } from '../../GeoLocation';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Optional } from '../../../util/decorators/optional';
import { Type } from 'class-transformer';
import { CREATE, UPDATE } from '../../../util/consts';

// TODO add remaining OCPI-specific properties
export class AdminConnectorDTO {
  @IsNumber()
  @IsNotEmpty()
  id!: number;
}

export class AdminEvseDTO {
  @IsString()
  @IsNotEmpty()
  station_id!: string;

  @IsNumber()
  @IsNotEmpty()
  id!: number;

  @IsString()
  @Optional()
  physical_reference?: string;

  @IsBoolean()
  @Optional()
  removed?: boolean;

  @IsArray()
  @Optional()
  @ValidateNested({ each: true })
  @Type(() => AdminConnectorDTO)
  connectors?: AdminConnectorDTO[];
}

export class AdminLocationDTO {
  // id is the Citrine Core Location database id, not the OcpiLocation's database id
  @IsNumber()
  @IsOptional({
    groups: [CREATE, UPDATE],
  })
  declare id: number;

  @IsString()
  @MaxLength(2)
  @IsNotEmpty({
    groups: [CREATE],
  })
  @IsOptional({
    groups: [UPDATE],
  })
  declare country_code: string;

  @IsString()
  @MaxLength(3)
  @IsNotEmpty({
    groups: [CREATE],
  })
  @IsOptional({
    groups: [UPDATE],
  })
  declare party_id: string;

  @IsString()
  @IsNotEmpty({
    groups: [CREATE],
  })
  @IsOptional({
    groups: [UPDATE],
  })
  declare name: string;

  @IsString()
  @IsNotEmpty({
    groups: [CREATE],
  })
  @IsOptional({
    groups: [UPDATE],
  })
  declare address: string;

  @IsString()
  @IsNotEmpty({
    groups: [CREATE],
  })
  @IsOptional({
    groups: [UPDATE],
  })
  declare city: string;

  @IsString()
  @IsNotEmpty({
    groups: [CREATE],
  })
  @IsOptional({
    groups: [UPDATE],
  })
  declare state: string;

  @IsString()
  @IsNotEmpty({
    groups: [CREATE],
  })
  @IsOptional({
    groups: [UPDATE],
  })
  declare postal_code: string;

  @IsString()
  @IsNotEmpty({
    groups: [CREATE],
  })
  @IsOptional({
    groups: [UPDATE],
  })
  declare country: string;

  @IsObject()
  @IsNotEmpty({
    groups: [CREATE],
  })
  @IsOptional({
    groups: [UPDATE],
  })
  @Type(() => GeoLocation)
  @ValidateNested()
  declare coordinates: GeoLocation;

  @IsString()
  @IsNotEmpty({
    groups: [CREATE],
  })
  @IsOptional({
    groups: [UPDATE],
  })
  declare time_zone: string;

  @IsBoolean()
  @Optional()
  declare publish?: boolean;

  @IsArray()
  @Optional()
  @Type(() => AdminEvseDTO)
  @ValidateNested({ each: true })
  declare evses?: AdminEvseDTO[];
}
