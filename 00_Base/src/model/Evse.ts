import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { EvseStatusSchedule } from './EvseStatusSchedule';
import { Capability } from './Capability';
import { ParkingRestriction } from './ParkingRestriction';
import { EvseStatus } from './EvseStatus';
import { Connector } from './Connector';
import { GeoLocation } from './GeoLocation';
import { DisplayText } from './DisplayText';
import { Type } from 'class-transformer';
import { Optional } from '../util/decorators/optional';
import { Enum } from '../util/decorators/enum';
import { OcpiResponse } from './ocpi.response';
import { Table, Model, DataType, Column } from "sequelize-typescript";

export class EvseDTO {
  UID_FORMAT = (stationId: string, id: string): string => `${stationId}::${id}`

  @MaxLength(36)
  @IsString()
  @IsNotEmpty()
  uid!: string;

  @MaxLength(48)
  @IsString()
  @Optional()
  evse_id?: string | null;

  @Enum(EvseStatus, 'EvseStatus')
  @IsNotEmpty()
  status!: EvseStatus;

  @IsArray()
  @Optional()
  @Type(() => EvseStatusSchedule)
  @ValidateNested({ each: true })
  status_schedule?: EvseStatusSchedule[] | null;

  @IsArray()
  @Optional()
  // @Type(() => Capability) // todo handle array of enum
  @ValidateNested({ each: true })
  capabilities?: Capability[] | null;

  @ArrayMinSize(1)
  @IsArray()
  @IsNotEmpty()
  @Type(() => Connector)
  @ValidateNested({ each: true })
  connectors!: Connector[];

  @MaxLength(4)
  @IsString()
  @Optional()
  floor_level?: string | null;

  @Optional()
  @Type(() => GeoLocation)
  @ValidateNested()
  coordinates?: GeoLocation | null;

  @MaxLength(16)
  @IsString()
  @Optional()
  physical_reference?: string | null;

  @IsArray()
  @Optional()
  @Type(() => DisplayText)
  @ValidateNested()
  directions?: DisplayText[] | null;

  @IsArray()
  @Optional()
  // @Type(() => ParkingRestriction) // todo handle array of enum
  @ValidateNested()
  parking_restrictions?: ParkingRestriction[] | null;

  @IsArray()
  @Optional()
  images?: null;

  @IsString()
  @IsDateString()
  @IsNotEmpty()
  @Type(() => Date)
  last_updated!: Date;
}

export class EvseResponse extends OcpiResponse<EvseDTO> {
  @IsObject()
  @IsNotEmpty()
  @Type(() => EvseDTO)
  @ValidateNested()
  data!: EvseDTO;
}

export class EvseListResponse extends OcpiResponse<EvseDTO[]> {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvseDTO)
  data!: EvseDTO[];
}

@Table
export class OcpiEvse extends Model<OcpiEvse> {
  // this is a GENERAL id, i.e. 1 or 2
  @Column({
    type: DataType.STRING,
    unique: 'id_stationId'
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @Column({
    type: DataType.STRING,
    unique: 'id_stationId'
  })
  @IsString()
  @IsNotEmpty()
  stationId!: string;

  @Column(DataType.STRING)
  @IsString()
  @IsNotEmpty()
  physicalReference?: string;
}
