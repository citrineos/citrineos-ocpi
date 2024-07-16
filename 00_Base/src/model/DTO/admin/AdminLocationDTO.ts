import { GeoLocation } from '../../GeoLocation';

// TODO add remaining OCPI-specific properties

export class AdminLocationDTO {
  citrine_location_id?: number;

  country_code!: string;

  party_id!: string;

  name?: string;

  address?: string;

  city?: string;

  state?: string;

  postal_code?: string;

  country?: string;

  coordinates?: GeoLocation;

  time_zone?: String;

  publish?: boolean;

  push_to_msps?: boolean;

  evses?: AdminEVSEDTO[];
}

export class AdminEVSEDTO {
  station_id!: string;

  id!: number;

  physical_reference?: string;

  removed?: boolean;

  connectors?: AdminConnectorDTO[];
}

export class AdminConnectorDTO {
  id!: number;
}