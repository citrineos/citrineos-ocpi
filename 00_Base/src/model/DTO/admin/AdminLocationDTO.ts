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

const LOCATION_INVALID_MSG =
  'New locations must have party_id, country_code, name, address, city, state, postal_code, and country.';
const EVSE_INVALID_MSG = 'EVSEs must have id and station_id.';
const CONNECTOR_INVALID_MSG = 'Connectors must have an id.';

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

  @IsArray()
  @Optional()
  evses?: AdminEVSEDTO[];

  static IS_LOCATION_INVALID = (
    adminLocationDto: AdminLocationDTO,
  ): [boolean, string] => {
    const locationInvalid =
      !adminLocationDto.id &&
      (!adminLocationDto.party_id ||
        !adminLocationDto.country_code ||
        !adminLocationDto.name ||
        !adminLocationDto.address ||
        !adminLocationDto.city ||
        !adminLocationDto.state ||
        !adminLocationDto.postal_code ||
        !adminLocationDto.country);

    const evseInvalid =
      !!adminLocationDto.evses &&
      adminLocationDto.evses.reduce(
        (eInvalid, evse) => eInvalid || !evse.id || !evse.station_id,
        false,
      );

    const connectorInvalid =
      !!adminLocationDto.evses &&
      adminLocationDto.evses
        .reduce(
          (connectors: AdminConnectorDTO[], evse) => [
            ...connectors,
            ...(evse.connectors ?? []),
          ],
          [],
        )
        .reduce((cInvalid, connector) => cInvalid || !connector.id, false);

    const invalid = locationInvalid || evseInvalid || connectorInvalid;

    const finalMessage = locationInvalid
      ? LOCATION_INVALID_MSG
      : evseInvalid
        ? EVSE_INVALID_MSG
        : connectorInvalid
          ? CONNECTOR_INVALID_MSG
          : '';

    return [invalid, finalMessage];
  };
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
  connectors?: AdminConnectorDTO[];
}

export class AdminConnectorDTO {
  @IsNumber()
  @IsNotEmpty()
  id!: number;
}

