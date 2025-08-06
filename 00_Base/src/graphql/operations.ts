export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  bigint: { input: any; output: any; }
  bpchar: { input: any; output: any; }
  enum_InstalledCertificates_certificateType: { input: any; output: any; }
  geography: { input: any; output: any; }
  geometry: { input: any; output: any; }
  json: { input: any; output: any; }
  jsonb: { input: any; output: any; }
  numeric: { input: any; output: any; }
  timestamptz: { input: any; output: any; }
};
export type GetChargingStationsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  partyId?: InputMaybe<Scalars['String']['input']>;
  dateFrom?: InputMaybe<Scalars['timestamptz']['input']>;
  dateTo?: InputMaybe<Scalars['timestamptz']['input']>;
}>;


export type GetChargingStationsQuery = { Locations: Array<{ id: number, name?: string | null, address?: string | null, city?: string | null, postalCode?: string | null, state?: string | null, country?: string | null, publishUpstream?: boolean | null, timeZone?: string | null, coordinates?: any | null, createdAt: any, updatedAt: any, Tenant: { partyId?: string | null, countryCode?: string | null }, chargingPool: Array<{ id: string, isOnline?: boolean | null, protocol?: string | null, chargePointVendor?: string | null, chargePointModel?: string | null, chargePointSerialNumber?: string | null, chargeBoxSerialNumber?: string | null, firmwareVersion?: string | null, iccid?: string | null, imsi?: string | null, meterType?: string | null, meterSerialNumber?: string | null, locationId?: number | null, createdAt: any, updatedAt: any, Evses: Array<{ id: number, stationId?: string | null, evseTypeId?: number | null, evseId?: string | null, physicalReference?: string | null, removed?: boolean | null, createdAt: any, updatedAt: any, Connectors: Array<{ id: number, stationId: string, evseId: number, connectorId: number, evseTypeConnectorId: number, status?: string | null, errorCode?: string | null, timestamp?: any | null, info?: string | null, vendorId?: string | null, vendorErrorCode?: string | null, createdAt: any, updatedAt: any }> }> }> }> };

export type GetChargingStationByIdQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetChargingStationByIdQuery = { ChargingStations: Array<{ id: string, isOnline?: boolean | null, protocol?: string | null, chargePointVendor?: string | null, chargePointModel?: string | null, chargePointSerialNumber?: string | null, chargeBoxSerialNumber?: string | null, firmwareVersion?: string | null, iccid?: string | null, imsi?: string | null, meterType?: string | null, meterSerialNumber?: string | null, locationId?: number | null, createdAt: any, updatedAt: any, Evses: Array<{ id: number, stationId?: string | null, evseTypeId?: number | null, evseId?: string | null, physicalReference?: string | null, removed?: boolean | null, createdAt: any, updatedAt: any, Connectors: Array<{ id: number, stationId: string, evseId: number, connectorId: number, evseTypeConnectorId: number, status?: string | null, errorCode?: string | null, timestamp?: any | null, info?: string | null, vendorId?: string | null, vendorErrorCode?: string | null, createdAt: any, updatedAt: any }> }>, Tenant: { partyId?: string | null, countryCode?: string | null } }> };

export type GetLocationsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  partyId?: InputMaybe<Scalars['String']['input']>;
  dateFrom?: InputMaybe<Scalars['timestamptz']['input']>;
  dateTo?: InputMaybe<Scalars['timestamptz']['input']>;
}>;


export type GetLocationsQuery = { Locations: Array<{ id: number, name?: string | null, address?: string | null, city?: string | null, coordinates?: any | null, country?: string | null, createdAt: any, facilities?: any | null, openingHours?: any | null, parkingType?: string | null, postalCode?: string | null, publishUpstream?: boolean | null, state?: string | null, timeZone?: string | null, updatedAt: any, Tenant: { partyId?: string | null, countryCode?: string | null }, chargingPool: Array<{ id: string, isOnline?: boolean | null, protocol?: string | null, capabilities?: any | null, chargePointVendor?: string | null, chargePointModel?: string | null, chargePointSerialNumber?: string | null, chargeBoxSerialNumber?: string | null, coordinates?: any | null, firmwareVersion?: string | null, floorLevel?: string | null, iccid?: string | null, imsi?: string | null, meterType?: string | null, meterSerialNumber?: string | null, parkingRestrictions?: any | null, locationId?: number | null, createdAt: any, updatedAt: any, Evses: Array<{ id: number, stationId?: string | null, evseTypeId?: number | null, evseId?: string | null, physicalReference?: string | null, removed?: boolean | null, createdAt: any, updatedAt: any, Connectors: Array<{ id: number, stationId: string, evseId: number, connectorId: number, evseTypeConnectorId: number, format?: string | null, maximumAmperage?: number | null, maximumPowerWatts?: number | null, maximumVoltage?: number | null, powerType?: string | null, termsAndConditionsUrl?: string | null, type?: string | null, status?: string | null, errorCode?: string | null, timestamp?: any | null, info?: string | null, vendorId?: string | null, vendorErrorCode?: string | null, createdAt: any, updatedAt: any }> }> }> }> };

export type GetLocationByIdQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetLocationByIdQuery = { Locations: Array<{ id: number, name?: string | null, address?: string | null, city?: string | null, coordinates?: any | null, country?: string | null, createdAt: any, facilities?: any | null, openingHours?: any | null, parkingType?: string | null, postalCode?: string | null, publishUpstream?: boolean | null, state?: string | null, timeZone?: string | null, updatedAt: any, Tenant: { partyId?: string | null, countryCode?: string | null }, chargingPool: Array<{ id: string, isOnline?: boolean | null, protocol?: string | null, capabilities?: any | null, chargePointVendor?: string | null, chargePointModel?: string | null, chargePointSerialNumber?: string | null, chargeBoxSerialNumber?: string | null, coordinates?: any | null, firmwareVersion?: string | null, floorLevel?: string | null, iccid?: string | null, imsi?: string | null, meterType?: string | null, meterSerialNumber?: string | null, parkingRestrictions?: any | null, locationId?: number | null, createdAt: any, updatedAt: any, Evses: Array<{ id: number, stationId?: string | null, evseTypeId?: number | null, evseId?: string | null, physicalReference?: string | null, removed?: boolean | null, createdAt: any, updatedAt: any, Connectors: Array<{ id: number, stationId: string, evseId: number, connectorId: number, evseTypeConnectorId: number, format?: string | null, maximumAmperage?: number | null, maximumPowerWatts?: number | null, maximumVoltage?: number | null, powerType?: string | null, termsAndConditionsUrl?: string | null, type?: string | null, status?: string | null, errorCode?: string | null, timestamp?: any | null, info?: string | null, vendorId?: string | null, vendorErrorCode?: string | null, createdAt: any, updatedAt: any }> }> }> }> };

export type GetEvseByIdQueryVariables = Exact<{
  locationId: Scalars['Int']['input'];
  stationId: Scalars['String']['input'];
  evseId: Scalars['Int']['input'];
}>;


export type GetEvseByIdQuery = { Locations: Array<{ chargingPool: Array<{ Evses: Array<{ id: number, stationId?: string | null, evseTypeId?: number | null, evseId?: string | null, physicalReference?: string | null, removed?: boolean | null, createdAt: any, updatedAt: any, ChargingStation?: { id: string, isOnline?: boolean | null, protocol?: string | null, capabilities?: any | null, chargePointVendor?: string | null, chargePointModel?: string | null, chargePointSerialNumber?: string | null, chargeBoxSerialNumber?: string | null, coordinates?: any | null, firmwareVersion?: string | null, floorLevel?: string | null, iccid?: string | null, imsi?: string | null, meterType?: string | null, meterSerialNumber?: string | null, parkingRestrictions?: any | null, locationId?: number | null, createdAt: any, updatedAt: any } | null }> }> }> };

export type GetConnectorByIdQueryVariables = Exact<{
  locationId: Scalars['Int']['input'];
  stationId: Scalars['String']['input'];
  evseId: Scalars['Int']['input'];
  connectorId: Scalars['Int']['input'];
}>;


export type GetConnectorByIdQuery = { Locations: Array<{ chargingPool: Array<{ Evses: Array<{ Connectors: Array<{ id: number, stationId: string, evseId: number, connectorId: number, evseTypeConnectorId: number, format?: string | null, maximumAmperage?: number | null, maximumPowerWatts?: number | null, maximumVoltage?: number | null, powerType?: string | null, termsAndConditionsUrl?: string | null, type?: string | null, status?: string | null, errorCode?: string | null, timestamp?: any | null, info?: string | null, vendorId?: string | null, vendorErrorCode?: string | null, createdAt: any, updatedAt: any }> }> }> }> };

export type GetTariffByKeyQueryVariables = Exact<{
  id: Scalars['Int']['input'];
  countryCode: Scalars['String']['input'];
  partyId: Scalars['String']['input'];
}>;


export type GetTariffByKeyQuery = { Tariffs: Array<{ authorizationAmount?: any | null, createdAt: any, currency: any, id: number, paymentFee?: any | null, pricePerKwh: any, pricePerMin?: any | null, pricePerSession?: any | null, stationId?: string | null, taxRate?: any | null, tariffAltText?: any | null, updatedAt: any, Tenant: { countryCode?: string | null, partyId?: string | null } }> };

export type GetTariffsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  dateFrom?: InputMaybe<Scalars['timestamptz']['input']>;
  dateTo?: InputMaybe<Scalars['timestamptz']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  partyId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetTariffsQuery = { Tariffs: Array<{ authorizationAmount?: any | null, createdAt: any, currency: any, id: number, paymentFee?: any | null, pricePerKwh: any, pricePerMin?: any | null, pricePerSession?: any | null, stationId?: string | null, taxRate?: any | null, tariffAltText?: any | null, updatedAt: any, Tenant: { countryCode?: string | null, partyId?: string | null } }>, Tariffs_aggregate: { aggregate?: { count: number } | null } };

export type UpdateTenantPartnerProfileMutationVariables = Exact<{
  partnerId: Scalars['Int']['input'];
  input: Scalars['jsonb']['input'];
}>;


export type UpdateTenantPartnerProfileMutation = { update_TenantPartners?: { affected_rows: number } | null };

export type DeleteTenantPartnerByIdMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteTenantPartnerByIdMutation = { delete_TenantPartners?: { affected_rows: number } | null };

export type GetTenantPartnerByServerTokenQueryVariables = Exact<{
  serverToken: Scalars['String']['input'];
}>;


export type GetTenantPartnerByServerTokenQuery = { TenantPartners: Array<{ id: number, countryCode?: string | null, partyId?: string | null, partnerProfileOCPI?: any | null, Tenant: { id: number, countryCode?: string | null, partyId?: string | null, serverProfileOCPI?: any | null } }> };

export type DeleteTenantPartnerByServerTokenMutationVariables = Exact<{
  serverToken: Scalars['String']['input'];
}>;


export type DeleteTenantPartnerByServerTokenMutation = { delete_TenantPartners?: { affected_rows: number } | null };

export type GetTenantPartnerByCpoClientAndModuleIdQueryVariables = Exact<{
  cpoCountryCode: Scalars['String']['input'];
  cpoPartyId: Scalars['String']['input'];
  clientCountryCode?: InputMaybe<Scalars['String']['input']>;
  clientPartyId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetTenantPartnerByCpoClientAndModuleIdQuery = { TenantPartners: Array<{ id: number, countryCode?: string | null, partyId?: string | null, partnerProfileOCPI?: any | null, Tenant: { id: number, countryCode?: string | null, partyId?: string | null, serverProfileOCPI?: any | null } }> };

export type TenantPartnersListQueryVariables = Exact<{
  cpoCountryCode: Scalars['String']['input'];
  cpoPartyId: Scalars['String']['input'];
  endpointIdentifier: Scalars['String']['input'];
}>;


export type TenantPartnersListQuery = { TenantPartners: Array<{ id: number, countryCode?: string | null, partyId?: string | null, partnerProfileOCPI?: any | null, Tenant: { id: number, countryCode?: string | null, partyId?: string | null, serverProfileOCPI?: any | null } }>, TenantPartners_aggregate: { aggregate?: { count: number } | null } };

export type GetTenantByIdQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetTenantByIdQuery = { Tenants: Array<{ serverProfileOCPI?: any | null, countryCode?: string | null, partyId?: string | null }> };

export type GetTransactionsQueryVariables = Exact<{
  cpoCountryCode?: InputMaybe<Scalars['String']['input']>;
  cpoPartyId?: InputMaybe<Scalars['String']['input']>;
  mspCountryCode?: InputMaybe<Scalars['String']['input']>;
  mspPartyId?: InputMaybe<Scalars['String']['input']>;
  dateFrom?: InputMaybe<Scalars['timestamptz']['input']>;
  dateTo?: InputMaybe<Scalars['timestamptz']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetTransactionsQuery = { Transactions: Array<{ id: number, stationId?: string | null, transactionId?: string | null, isActive?: boolean | null, chargingState?: string | null, timeSpentCharging?: any | null, totalKwh?: any | null, stoppedReason?: string | null, remoteStartId?: number | null, totalCost?: any | null, createdAt: any, updatedAt: any, evse?: { id: number } | null, chargingStation?: { connectors: Array<{ id: number, connectorId: number }>, location?: { id: number, name?: string | null, address?: string | null, city?: string | null, postalCode?: string | null, state?: string | null, country?: string | null, coordinates?: any | null } | null } | null, transactionEvents: Array<{ id: number, eventType?: string | null, transactionInfo?: any | null, EvseType?: { id?: number | null } | null }>, startTransaction?: { timestamp?: any | null } | null, stopTransaction?: { timestamp?: any | null } | null, meterValues: Array<{ timestamp?: any | null, sampledValue?: any | null }> }>, Transactions_aggregate: { aggregate?: { count: number } | null } };
