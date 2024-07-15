import { GeoLocation } from '../../GeoLocation';

// TODO add remaining OCPI-specific properties

export class AdminLocationDTO {
  declare id: number;

  declare citrine_location_id: number;

  declare country_code: string;

  declare party_id: string;

  declare name: string;

  declare address: string;

  declare city: string;

  declare state: string;

  declare postal_code: string;

  declare country: string;

  declare coordinates: GeoLocation;

  declare time_zone: String;

  declare publish: boolean;

  declare push_to_msps: boolean;

  declare evses: AdminEVSEDTO[];
}

export class AdminEVSEDTO {
  declare station_id: string;

  declare id: number;

  declare physical_reference: string;

  declare removed: true;

  declare connectors: AdminConnectorDTO[];
}

export class AdminConnectorDTO {
  declare id: number;

}