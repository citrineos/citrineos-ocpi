import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested
} from "class-validator";
import { Optional } from "../../util/decorators/optional";
import { Enum } from "../../util/decorators/enum";
import { EvseStatus } from "../EvseStatus";
import { Type } from "class-transformer";
import { EvseStatusSchedule } from "../EvseStatusSchedule";
import { Capability } from "../Capability";
import { ConnectorDTO } from "./ConnectorDTO";
import { GeoLocation } from "../GeoLocation";
import { DisplayText } from "../DisplayText";
import { ParkingRestriction } from "../ParkingRestriction";
import { OcpiResponse } from "../ocpi.response";

// TODO make dynamic
const uidDelimiter = '::';
export const UID_FORMAT = (stationId: string, evseId: number): string => `${stationId}${uidDelimiter}${evseId}`;

export const EXTRACT_STATION_ID = (evseUid: string) => {
  const split = evseUid.split(uidDelimiter);
  return split.length > 1 ? split[0] : '';
};

export const EXTRACT_EVSE_ID = (evseUid: string) => {
  const split = evseUid.split(uidDelimiter);
  return split.length > 1 ? split[split.length - 1] : '';
};

export class EvseDTO {

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
  @Type(() => ConnectorDTO)
  @ValidateNested({ each: true })
  connectors!: ConnectorDTO[];

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
