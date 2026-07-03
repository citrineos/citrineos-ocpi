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
  citext: { input: string; output: string; }
  authorization_status: { input: string; output: string; }
};
export type Authorizations_Set_Input = {
  additionalInfo?: InputMaybe<Scalars['jsonb']['input']>;
  language1?: InputMaybe<Scalars['String']['input']>;
  groupAuthorizationId?: InputMaybe<Scalars['Int']['input']>;
  realTimeAuth?: InputMaybe<Scalars['String']['input']>;
  updatedAt: Scalars['timestamptz']['input'];
  status?: InputMaybe<Scalars['authorization_status']['input']>;
};
export type Locations_Bool_Exp = {
  ownerTenantPartnerId?: InputMaybe<Int_Comparison_Exp>;
  roamingPartnerId?: InputMaybe<Int_Comparison_Exp>;
  deletedAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  updatedAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  Tenant?: InputMaybe<Tenants_Bool_Exp>;
};
export type Boolean_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Boolean']['input']>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
};
export type Tariffs_Bool_Exp = {
  updatedAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  Tenant?: InputMaybe<Tenants_Bool_Exp>;
  tenantPartnerId?: InputMaybe<Int_Comparison_Exp>;
};
export type Sessions_Bool_Exp = {
  countryCode?: InputMaybe<String_Comparison_Exp>;
  partyId?: InputMaybe<String_Comparison_Exp>;
  ocpiSessionId?: InputMaybe<String_Comparison_Exp>;
  tenantPartnerId?: InputMaybe<Int_Comparison_Exp>;
  updatedAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  Tenant?: InputMaybe<Tenants_Bool_Exp>;
};
export type Int_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Int']['input']>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
};
export type Transactions_Bool_Exp = {
  updatedAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  Authorization?: InputMaybe<Authorizations_Bool_Exp>;
  Tenant?: InputMaybe<Tenants_Bool_Exp>;
};
export type Authorizations_Bool_Exp = {
  TenantPartner?: InputMaybe<TenantPartners_Bool_Exp>;
};
export type Authorizations_Paginated_Bool_Exp = {
  updatedAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  TenantPartner?: InputMaybe<TenantPartners_Bool_Exp>;
  Tenant?: InputMaybe<Tenants_Bool_Exp>;
  tenantPartnerId?: InputMaybe<Int_Comparison_Exp>;
  tenants?: InputMaybe<AuthorizationTenants_Bool_Exp>;
};
export type Timestamptz_Comparison_Exp = {
  _gte?: InputMaybe<Scalars['timestamptz']['input']>;
  _lte?: InputMaybe<Scalars['timestamptz']['input']>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
};
export type Tenants_Bool_Exp = {
  countryCode?: InputMaybe<String_Comparison_Exp>;
  partyId?: InputMaybe<String_Comparison_Exp>;
};
export type TenantPartners_Bool_Exp = {
  countryCode?: InputMaybe<String_Comparison_Exp>;
  partyId?: InputMaybe<String_Comparison_Exp>;
};
export type String_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['String']['input']>;
};
export type Tariffs_Insert_Input = any;
export type Sessions_Insert_Input = any;
export type Sessions_Set_Input = any;
export type Tariffs_Set_Input = any;
export type TariffElements_Insert_Input = any;
export type Evses_Insert_Input = any;
export type ConnectorTariffs_Insert_Input = any;
export type Connectors_Insert_Input = any;
export type ChargingStations_Insert_Input = any;
export type Evses_Set_Input = any;
export type Connectors_Set_Input = any;
export type Locations_Insert_Input = any;
export type Locations_Set_Input = any;
export type Cdrs_Insert_Input = any;
export type Cdrs_Set_Input = any;
export type Cdrs_Bool_Exp = {
  countryCode?: InputMaybe<String_Comparison_Exp>;
  partyId?: InputMaybe<String_Comparison_Exp>;
  ocpiCdrId?: InputMaybe<String_Comparison_Exp>;
  tenantPartnerId?: InputMaybe<Int_Comparison_Exp>;
  updatedAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  lastUpdated?: InputMaybe<Timestamptz_Comparison_Exp>;
  Tenant?: InputMaybe<Tenants_Bool_Exp>;
};
export type AuthorizationTenants_Bool_Exp = {
  tenant?: InputMaybe<Tenants_Bool_Exp>;
  tenantId?: InputMaybe<Int_Comparison_Exp>;
};
export type SessionDbRow = {
  id: number;
  ocpiSessionId: string;
  countryCode: string;
  partyId: string;
  startDateTime: any;
  endDateTime?: any | null;
  kwh: any;
  cdrToken: any;
  authMethod: string;
  authorizationReference?: string | null;
  locationId: string;
  evseUid: string;
  connectorId: string;
  meterId?: string | null;
  currency: string;
  chargingPeriods?: any | null;
  totalCost?: any | null;
  status: string;
  lastUpdated: any;
  tenantId: number;
  tenantPartnerId: number;
  createdAt?: any;
  updatedAt?: any;
};
export type GetCdrByiIdQueryVariables = Exact<{
  countryCode: Scalars['String']['input'];
  partyId: Scalars['String']['input'];
  id: Scalars['Int']['input'];
  tenantPartnerId: Scalars['Int']['input'];
}>;


export type GetCdrByiIdQueryResult = {
  Cdrs: Array<{
    id: number,
    ocpiCdrId: string,
    countryCode: string,
    partyId: string,
    startDateTime: any,
    endDateTime: any,
    sessionId?: string | null,
    cdrToken: any,
    authMethod: string,
    authorizationReference?: string | null,
    cdrLocation: any,
    meterId?: string | null,
    currency: string,
    tariffs?: any | null,
    chargingPeriods: any,
    signedData?: any | null,
    totalCost: any,
    totalFixedCost?: any | null,
    totalEnergy: any,
    totalEnergyCost?: any | null,
    totalTime: any,
    totalTimeCost?: any | null,
    totalParkingTime?: any | null,
    totalParkingCost?: any | null,
    totalReservationCost?: any | null,
    remark?: string | null,
    invoiceReferenceId?: string | null,
    credit?: boolean | null,
    creditReferenceId?: string | null,
    homeChargingCompensation?: boolean | null,
    lastUpdated: any,
    tenantId: number,
    tenantPartnerId: number,
    createdAt?: any | null,
    updatedAt?: any | null
  }>
};

export type GetCdrByiIdAndRoamingPartnerQueryVariables = Exact<{
  countryCode: Scalars['String']['input'];
  partyId: Scalars['String']['input'];
  id: Scalars['Int']['input'];
  tenantPartnerId: Scalars['Int']['input'];
  roamingPartnerId: Scalars['Int']['input'];
}>;


export type GetCdrByiIdAndRoamingPartnerQueryResult = {
  Cdrs: Array<{
    id: number,
    ocpiCdrId: string,
    countryCode: string,
    partyId: string,
    startDateTime: any,
    endDateTime: any,
    sessionId?: string | null,
    cdrToken: any,
    authMethod: string,
    authorizationReference?: string | null,
    cdrLocation: any,
    meterId?: string | null,
    currency: string,
    tariffs?: any | null,
    chargingPeriods: any,
    signedData?: any | null,
    totalCost: any,
    totalFixedCost?: any | null,
    totalEnergy: any,
    totalEnergyCost?: any | null,
    totalTime: any,
    totalTimeCost?: any | null,
    totalParkingTime?: any | null,
    totalParkingCost?: any | null,
    totalReservationCost?: any | null,
    remark?: string | null,
    invoiceReferenceId?: string | null,
    credit?: boolean | null,
    creditReferenceId?: string | null,
    homeChargingCompensation?: boolean | null,
    lastUpdated: any,
    tenantId: number,
    tenantPartnerId: number,
    createdAt?: any | null,
    updatedAt?: any | null
  }>
};

export type GetCdrsPaginatedQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where: Cdrs_Bool_Exp;
}>;


export type GetCdrsPaginatedQueryResult = {
  Cdrs: Array<{
    id: number,
    ocpiCdrId: string,
    countryCode: string,
    partyId: string,
    startDateTime: any,
    endDateTime: any,
    sessionId?: string | null,
    cdrToken: any,
    authMethod: string,
    authorizationReference?: string | null,
    cdrLocation: any,
    meterId?: string | null,
    currency: string,
    tariffs?: any | null,
    chargingPeriods: any,
    signedData?: any | null,
    totalCost: any,
    totalFixedCost?: any | null,
    totalEnergy: any,
    totalEnergyCost?: any | null,
    totalTime: any,
    totalTimeCost?: any | null,
    totalParkingTime?: any | null,
    totalParkingCost?: any | null,
    totalReservationCost?: any | null,
    remark?: string | null,
    invoiceReferenceId?: string | null,
    credit?: boolean | null,
    creditReferenceId?: string | null,
    homeChargingCompensation?: boolean | null,
    lastUpdated: any,
    tenantId: number,
    tenantPartnerId: number,
    createdAt?: any | null,
    updatedAt?: any | null
  }>
};

export type InsertCdrMutationVariables = Exact<{
  object: Cdrs_Insert_Input;
}>;


export type InsertCdrMutationResult = {
  insert_Cdrs_one?: {
    id: number,
    ocpiCdrId: string,
    countryCode: string,
    partyId: string,
    startDateTime: any,
    endDateTime: any,
    sessionId?: string | null,
    cdrToken: any,
    authMethod: string,
    authorizationReference?: string | null,
    cdrLocation: any,
    meterId?: string | null,
    currency: string,
    tariffs?: any | null,
    chargingPeriods: any,
    signedData?: any | null,
    totalCost: any,
    totalFixedCost?: any | null,
    totalEnergy: any,
    totalEnergyCost?: any | null,
    totalTime: any,
    totalTimeCost?: any | null,
    totalParkingTime?: any | null,
    totalParkingCost?: any | null,
    totalReservationCost?: any | null,
    remark?: string | null,
    invoiceReferenceId?: string | null,
    credit?: boolean | null,
    creditReferenceId?: string | null,
    homeChargingCompensation?: boolean | null,
    lastUpdated: any,
    tenantId: number,
    tenantPartnerId: number,
    createdAt?: any | null,
    updatedAt?: any | null,
    roamingPartnerId?: number | null
  } | null
};

export type FindCdrP2pQueryVariables = Exact<{
  ocpiCdrId: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
}>;


export type FindCdrP2pQueryResult = {
  Cdrs: Array<{
    id: number
  }>
};

export type FindCdrRoamingQueryVariables = Exact<{
  ocpiCdrId: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
  roamingPartnerId: Scalars['Int']['input'];
}>;


export type FindCdrRoamingQueryResult = {
  Cdrs: Array<{
    id: number
  }>
};

export type GetChargingStationByIdQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetChargingStationByIdQueryResult = {
  ChargingStations: Array<{
    id: string,
    tenantId: number,
    isOnline?: boolean | null,
    protocol?: string | null,
    chargePointVendor?: string | null,
    chargePointModel?: string | null,
    chargePointSerialNumber?: string | null,
    chargeBoxSerialNumber?: string | null,
    firmwareVersion?: string | null,
    iccid?: string | null,
    imsi?: string | null,
    meterType?: string | null,
    meterSerialNumber?: string | null,
    locationId: number,
    createdAt: any,
    updatedAt: any,
    evses: Array<{
      id: number,
      tenantId: number,
      stationId?: string | null,
      evseTypeId?: number | null,
      evseId?: string | null,
      physicalReference?: string | null,
      removed?: boolean | null,
      createdAt: any,
      updatedAt: any
    }>,
    connectors: Array<{
      id: number,
      tenantId: number,
      stationId: string,
      evseId?: number | null,
      connectorId?: number | null,
      evseTypeConnectorId?: number | null,
      status?: string | null,
      errorCode?: string | null,
      timestamp?: any | null,
      info?: string | null,
      vendorId?: string | null,
      vendorErrorCode?: string | null,
      createdAt: any,
      updatedAt: any
    }>,
    activeTransactions: Array<{
      id: number,
      connectorId?: number | null,
      evseId?: number | null
    }>,
    tenant: {
      partyId?: string | null,
      countryCode?: string | null
    }
  }>
};

export type GetChargingStationByLocationAndOwnerPartnerQueryVariables = Exact<{
  locationId: Scalars['Int']['input'];
  partnerId: Scalars['Int']['input'];
}>;


export type GetChargingStationByLocationAndOwnerPartnerQueryResult = {
  ChargingStations: Array<{
    id: string
  }>
};

export type InsertChargingStationMutationVariables = Exact<{
  object: ChargingStations_Insert_Input;
}>;


export type InsertChargingStationMutationResult = {
  insert_ChargingStations_one?: {
    id: string,
    locationId: number
  } | null
};

export type GetSequenceQueryVariables = Exact<{
  tenantId: Scalars['Int']['input'];
  stationId: Scalars['String']['input'];
  type: Scalars['String']['input'];
}>;


export type GetSequenceQueryResult = {
  ChargingStationSequences: Array<{
    value: any
  }>
};

export type UpsertSequenceMutationVariables = Exact<{
  tenantId: Scalars['Int']['input'];
  stationId: Scalars['String']['input'];
  type: Scalars['String']['input'];
  value: Scalars['bigint']['input'];
  createdAt: Scalars['timestamptz']['input'];
}>;


export type UpsertSequenceMutationResult = {
  insert_ChargingStationSequences_one?: {
    value: any
  } | null
};

export type UpsertConnectorMutationVariables = Exact<{
  object: Connectors_Insert_Input;
}>;


export type UpsertConnectorMutationResult = {
  insert_Connectors_one?: {
    id: number,
    ocpiId?: string | null
  } | null
};

export type GetPartnerConnectorByOcpiIdAndEvseIdQueryVariables = Exact<{
  partnerId: Scalars['Int']['input'];
  locationId: Scalars['String']['input'];
  evseUid: Scalars['String']['input'];
  connectorId: Scalars['String']['input'];
}>;


export type GetPartnerConnectorByOcpiIdAndEvseIdQueryResult = {
  Locations: Array<{
    id: number,
    chargingPool: Array<{
      id: string,
      evses: Array<{
        id: number,
        connectors: Array<{
          id: number
        }>
      }>
    }>
  }>
};

export type GetPartnerConnectorByOcpiIdAndEvseIdAndRoamingPartnerIdQueryVariables = Exact<{
  partnerId: Scalars['Int']['input'];
  locationId: Scalars['String']['input'];
  evseUid: Scalars['String']['input'];
  connectorId: Scalars['String']['input'];
  roamingPartnerId: Scalars['Int']['input'];
}>;


export type GetPartnerConnectorByOcpiIdAndEvseIdAndRoamingPartnerIdQueryResult = {
  Locations: Array<{
    id: number,
    chargingPool: Array<{
      id: string,
      evses: Array<{
        id: number,
        connectors: Array<{
          id: number
        }>
      }>
    }>
  }>
};

export type GetConnectorByOcpiIdAndEvseIdAndRoamingPartnerIdQueryVariables = Exact<{
  partnerId: Scalars['Int']['input'];
  locationId: Scalars['String']['input'];
  evseUid: Scalars['String']['input'];
  connectorId: Scalars['String']['input'];
  roamingPartnerId: Scalars['Int']['input'];
}>;


export type GetConnectorByOcpiIdAndEvseIdAndRoamingPartnerIdQueryResult = {
  Connectors: Array<{
    id: number,
    ocpiId?: string | null,
    evseId?: number | null,
    stationId: string,
    connectorId?: number | null,
    format?: string | null,
    maximumAmperage?: number | null,
    maximumPowerWatts?: number | null,
    maximumVoltage?: number | null,
    powerType?: string | null,
    termsAndConditionsUrl?: string | null,
    type?: string | null,
    status?: string | null,
    errorCode?: string | null,
    timestamp?: any | null,
    info?: string | null,
    vendorId?: string | null,
    vendorErrorCode?: string | null,
    createdAt: any,
    updatedAt: any,
    tariffs: Array<{
      id: number,
      tariffOcpiId: string,
      connectorOcpiId: string,
      tariffId: number,
      connectorId: number
    }>
  }>
};

export type GetConnectorByOcpiIdAndEvseIdQueryVariables = Exact<{
  partnerId: Scalars['Int']['input'];
  locationId: Scalars['String']['input'];
  evseUid: Scalars['String']['input'];
  connectorId: Scalars['String']['input'];
}>;


export type GetConnectorByOcpiIdAndEvseIdQueryResult = {
  Connectors: Array<{
    id: number,
    ocpiId?: string | null,
    evseId?: number | null,
    stationId: string,
    connectorId?: number | null,
    format?: string | null,
    maximumAmperage?: number | null,
    maximumPowerWatts?: number | null,
    maximumVoltage?: number | null,
    powerType?: string | null,
    termsAndConditionsUrl?: string | null,
    type?: string | null,
    status?: string | null,
    errorCode?: string | null,
    timestamp?: any | null,
    info?: string | null,
    vendorId?: string | null,
    vendorErrorCode?: string | null,
    createdAt: any,
    updatedAt: any,
    tariffs: Array<{
      id: number,
      tariffOcpiId: string,
      connectorOcpiId: string,
      tariffId: number,
      connectorId: number
    }>
  }>
};

export type UpdateConnectorPatchMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  changes: Connectors_Set_Input;
}>;


export type UpdateConnectorPatchMutationResult = {
  update_Connectors_by_pk?: {
    id: number,
    updatedAt: any
  } | null
};

export type UpsertConnectorTariffOcpiPartnerMutationVariables = Exact<{
  object: ConnectorTariffs_Insert_Input;
}>;


export type UpsertConnectorTariffOcpiPartnerMutationResult = {
  insert_ConnectorTariffs_one?: {
    id: number
  } | null
};

export type DeleteOcpiConnectorTariffMutationVariables = Exact<{
  connectorId: Scalars['Int']['input'];
  connectorOcpiId: Scalars['String']['input'];
}>;


export type DeleteOcpiConnectorTariffMutationResult = {
  delete_ConnectorTariffs?: {
    affected_rows: number
  } | null
};

export type MarkConnectorDeletedMutationVariables = Exact<{
  connectorId: Scalars['Int']['input'];
  deletedAt: Scalars['timestamptz']['input'];
}>;


export type MarkConnectorDeletedMutationResult = {
  update_Connectors_by_pk?: {
    id: number
  } | null
};

export type GetOwnConnectorForTariffBroadcastQueryVariables = Exact<{
  connectorId: Scalars['Int']['input'];
}>;


export type GetOwnConnectorForTariffBroadcastQueryResult = {
  Connectors_by_pk?: {
    id: number,
    stationId: string,
    evseId?: number | null,
    updatedAt: any,
    ChargingStation: {
      locationId: number,
      Location: {
        id: number,
        ownerTenantPartnerId?: number | null
      }
    },
    tariffs: Array<{
      tariffOcpiId: string
    }>
  } | null
};

export type UpsertEvseMutationVariables = Exact<{
  object: Evses_Insert_Input;
}>;


export type UpsertEvseMutationResult = {
  insert_Evses_one?: {
    id: number,
    ocpiUid?: string | null
  } | null
};

export type GetPartnerEvseByOcpiIdsQueryVariables = Exact<{
  partnerId: Scalars['Int']['input'];
  locationId: Scalars['String']['input'];
  evseUid: Scalars['String']['input'];
}>;


export type GetPartnerEvseByOcpiIdsQueryResult = {
  Locations: Array<{
    id: number,
    chargingPool: Array<{
      evses: Array<{
        id: number
      }>
    }>
  }>
};

export type GetPartnerEvseByOcpiIdAndRoamingPartnerIdQueryVariables = Exact<{
  partnerId: Scalars['Int']['input'];
  locationId: Scalars['String']['input'];
  evseUid: Scalars['String']['input'];
  roamingPartnerId: Scalars['Int']['input'];
}>;


export type GetPartnerEvseByOcpiIdAndRoamingPartnerIdQueryResult = {
  Locations: Array<{
    id: number,
    chargingPool: Array<{
      evses: Array<{
        id: number
      }>
    }>
  }>
};

export type UpdateEvsePatchMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  changes: Evses_Set_Input;
}>;


export type UpdateEvsePatchMutationResult = {
  update_Evses_by_pk?: {
    id: number,
    updatedAt: any
  } | null
};

export type GetEvseByOcpiIdAndPartnerIdQueryVariables = Exact<{
  partnerId: Scalars['Int']['input'];
  locationId: Scalars['String']['input'];
  evseUid: Scalars['String']['input'];
}>;


export type GetEvseByOcpiIdAndPartnerIdQueryResult = {
  Evses: Array<{
    id: number,
    stationId?: string | null,
    evseTypeId?: number | null,
    evseId?: string | null,
    ocpiUid?: string | null,
    physicalReference?: string | null,
    removed?: boolean | null,
    createdAt: any,
    updatedAt: any,
    floorLevel?: string | null,
    capabilities?: any | null,
    parkingRestrictions?: any | null,
    statusSchedule?: any | null,
    images?: any | null,
    directions?: any | null,
    coordinates?: any | null,
    ocpiStatus?: string | null,
    ChargingStation?: {
      id: string,
      location: {
        id: number,
        ocpiId?: string | null,
        ownerTenantPartnerId?: number | null,
        updatedAt: any
      }
    } | null,
    connectors: Array<{
      id: number,
      evseId?: number | null,
      ocpiId?: string | null,
      stationId: string,
      connectorId?: number | null,
      format?: string | null,
      maximumAmperage?: number | null,
      maximumPowerWatts?: number | null,
      maximumVoltage?: number | null,
      powerType?: string | null,
      termsAndConditionsUrl?: string | null,
      type?: string | null,
      status?: string | null,
      errorCode?: string | null,
      timestamp?: any | null,
      createdAt: any,
      updatedAt: any,
      tariffs: Array<{
        id: number,
        tariffOcpiId: string,
        connectorOcpiId: string,
        tariffId: number,
        connectorId: number
      }>
    }>
  }>
};

export type GetEvseByOcpiIdPartnerAndRoamingPartnerIdQueryVariables = Exact<{
  partnerId: Scalars['Int']['input'];
  locationId: Scalars['String']['input'];
  evseUid: Scalars['String']['input'];
  roamingPartnerId: Scalars['Int']['input'];
}>;


export type GetEvseByOcpiIdPartnerAndRoamingPartnerIdQueryResult = {
  Evses: Array<{
    id: number,
    stationId?: string | null,
    evseTypeId?: number | null,
    evseId?: string | null,
    ocpiUid?: string | null,
    physicalReference?: string | null,
    removed?: boolean | null,
    createdAt: any,
    updatedAt: any,
    floorLevel?: string | null,
    capabilities?: any | null,
    parkingRestrictions?: any | null,
    statusSchedule?: any | null,
    images?: any | null,
    directions?: any | null,
    coordinates?: any | null,
    ocpiStatus?: string | null,
    ChargingStation?: {
      id: string,
      location: {
        id: number,
        ocpiId?: string | null,
        ownerTenantPartnerId?: number | null,
        roamingPartnerId?: number | null,
        updatedAt: any
      }
    } | null,
    connectors: Array<{
      id: number,
      evseId?: number | null,
      ocpiId?: string | null,
      stationId: string,
      connectorId?: number | null,
      format?: string | null,
      maximumAmperage?: number | null,
      maximumPowerWatts?: number | null,
      maximumVoltage?: number | null,
      powerType?: string | null,
      termsAndConditionsUrl?: string | null,
      type?: string | null,
      status?: string | null,
      errorCode?: string | null,
      timestamp?: any | null,
      createdAt: any,
      updatedAt: any,
      tariffs: Array<{
        id: number,
        tariffOcpiId: string,
        connectorOcpiId: string,
        tariffId: number,
        connectorId: number
      }>
    }>
  }>
};

export type GetOurLocationsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where: Locations_Bool_Exp;
}>;


export type GetOurLocationsQueryResult = {
  Locations_aggregate: {
    aggregate?: {
      count: number
    } | null
  },
  Locations: Array<{
    id: number,
    name?: string | null,
    address?: string | null,
    city?: string | null,
    coordinates?: any | null,
    country?: string | null,
    createdAt: any,
    facilities?: any | null,
    openingHours?: any | null,
    parkingType?: string | null,
    postalCode?: string | null,
    publishUpstream?: boolean | null,
    state?: string | null,
    timeZone?: string | null,
    updatedAt: any,
    operator?: any | null,
    owner?: any | null,
    tenant: {
      name: string,
      isUserTenant: boolean,
      partyId?: string | null,
      countryCode?: string | null
    },
    chargingPool: Array<{
      id: string,
      isOnline?: boolean | null,
      protocol?: string | null,
      capabilities?: any | null,
      chargePointVendor?: string | null,
      chargePointModel?: string | null,
      chargePointSerialNumber?: string | null,
      chargeBoxSerialNumber?: string | null,
      coordinates?: any | null,
      firmwareVersion?: string | null,
      floorLevel?: string | null,
      iccid?: string | null,
      imsi?: string | null,
      meterType?: string | null,
      meterSerialNumber?: string | null,
      parkingRestrictions?: any | null,
      locationId: number,
      createdAt: any,
      updatedAt: any,
      evses: Array<{
        id: number,
        stationId?: string | null,
        evseTypeId?: number | null,
        evseId?: string | null,
        physicalReference?: string | null,
        removed?: boolean | null,
        createdAt: any,
        updatedAt: any,
        connectors: Array<{
          id: number,
          stationId: string,
          evseId?: number | null,
          connectorId?: number | null,
          evseTypeConnectorId?: number | null,
          format?: string | null,
          maximumAmperage?: number | null,
          maximumPowerWatts?: number | null,
          maximumVoltage?: number | null,
          powerType?: string | null,
          termsAndConditionsUrl?: string | null,
          type?: string | null,
          status?: string | null,
          errorCode?: string | null,
          timestamp?: any | null,
          info?: string | null,
          vendorId?: string | null,
          vendorErrorCode?: string | null,
          createdAt: any,
          updatedAt: any,
          tariffs: Array<{
            tariffOcpiId: string,
            tariffId: number,
            Tariff: {
              ocpiTariffId?: string | null,
              id: number
            }
          }>
        }>
      }>
    }>
  }>
};

export type GetOurLocationByIdQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetOurLocationByIdQueryResult = {
  Locations: Array<{
    id: number,
    name?: string | null,
    address?: string | null,
    city?: string | null,
    coordinates?: any | null,
    country?: string | null,
    createdAt: any,
    facilities?: any | null,
    openingHours?: any | null,
    parkingType?: string | null,
    postalCode?: string | null,
    publishUpstream?: boolean | null,
    state?: string | null,
    timeZone?: string | null,
    updatedAt: any,
    tenant: {
      name: string,
      isUserTenant: boolean,
      partyId?: string | null,
      countryCode?: string | null
    },
    chargingPool: Array<{
      id: string,
      isOnline?: boolean | null,
      protocol?: string | null,
      capabilities?: any | null,
      chargePointVendor?: string | null,
      chargePointModel?: string | null,
      chargePointSerialNumber?: string | null,
      chargeBoxSerialNumber?: string | null,
      coordinates?: any | null,
      firmwareVersion?: string | null,
      floorLevel?: string | null,
      iccid?: string | null,
      imsi?: string | null,
      meterType?: string | null,
      meterSerialNumber?: string | null,
      parkingRestrictions?: any | null,
      locationId: number,
      createdAt: any,
      updatedAt: any,
      evses: Array<{
        id: number,
        stationId?: string | null,
        evseTypeId?: number | null,
        evseId?: string | null,
        physicalReference?: string | null,
        removed?: boolean | null,
        createdAt: any,
        updatedAt: any,
        connectors: Array<{
          id: number,
          stationId: string,
          evseId?: number | null,
          connectorId?: number | null,
          evseTypeConnectorId?: number | null,
          format?: string | null,
          maximumAmperage?: number | null,
          maximumPowerWatts?: number | null,
          maximumVoltage?: number | null,
          powerType?: string | null,
          termsAndConditionsUrl?: string | null,
          type?: string | null,
          status?: string | null,
          errorCode?: string | null,
          timestamp?: any | null,
          info?: string | null,
          vendorId?: string | null,
          vendorErrorCode?: string | null,
          createdAt: any,
          updatedAt: any,
          tariffs: Array<{
            tariffOcpiId: string,
            tariffId: number,
            Tariff: {
              ocpiTariffId?: string | null,
              id: number
            }
          }>
        }>
      }>
    }>
  }>
};

export type GetLocationByOcpiIdQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetLocationByOcpiIdQueryResult = {
  Locations: Array<{
    id: number,
    name?: string | null,
    address?: string | null,
    city?: string | null,
    coordinates?: any | null,
    country?: string | null,
    createdAt: any,
    facilities?: any | null,
    openingHours?: any | null,
    parkingType?: string | null,
    postalCode?: string | null,
    publishUpstream?: boolean | null,
    state?: string | null,
    timeZone?: string | null,
    updatedAt: any,
    tenant: {
      partyId?: string | null,
      countryCode?: string | null
    },
    chargingPool: Array<{
      id: string,
      isOnline?: boolean | null,
      protocol?: string | null,
      capabilities?: any | null,
      chargePointVendor?: string | null,
      chargePointModel?: string | null,
      chargePointSerialNumber?: string | null,
      chargeBoxSerialNumber?: string | null,
      coordinates?: any | null,
      firmwareVersion?: string | null,
      floorLevel?: string | null,
      iccid?: string | null,
      imsi?: string | null,
      meterType?: string | null,
      meterSerialNumber?: string | null,
      parkingRestrictions?: any | null,
      locationId: number,
      createdAt: any,
      updatedAt: any,
      evses: Array<{
        id: number,
        stationId?: string | null,
        evseTypeId?: number | null,
        evseId?: string | null,
        ocpiUid?: string | null,
        physicalReference?: string | null,
        removed?: boolean | null,
        createdAt: any,
        updatedAt: any,
        connectors: Array<{
          id: number,
          stationId: string,
          evseId?: number | null,
          connectorId?: number | null,
          evseTypeConnectorId?: number | null,
          format?: string | null,
          maximumAmperage?: number | null,
          maximumPowerWatts?: number | null,
          maximumVoltage?: number | null,
          powerType?: string | null,
          termsAndConditionsUrl?: string | null,
          type?: string | null,
          status?: string | null,
          errorCode?: string | null,
          timestamp?: any | null,
          info?: string | null,
          vendorId?: string | null,
          vendorErrorCode?: string | null,
          createdAt: any,
          updatedAt: any,
          tariffs: Array<{
            id: number,
            tariffOcpiId: string,
            connectorOcpiId: string,
            tariffId: number,
            connectorId: number
          }>
        }>
      }>
    }>
  }>
};

export type GetEvseByIdQueryVariables = Exact<{
  locationId: Scalars['Int']['input'];
  stationId: Scalars['String']['input'];
  evseId: Scalars['Int']['input'];
}>;


export type GetEvseByIdQueryResult = {
  Locations: Array<{
    chargingPool: Array<{
      id: string,
      isOnline?: boolean | null,
      protocol?: string | null,
      capabilities?: any | null,
      chargePointVendor?: string | null,
      chargePointModel?: string | null,
      chargePointSerialNumber?: string | null,
      chargeBoxSerialNumber?: string | null,
      coordinates?: any | null,
      firmwareVersion?: string | null,
      floorLevel?: string | null,
      iccid?: string | null,
      imsi?: string | null,
      meterType?: string | null,
      meterSerialNumber?: string | null,
      parkingRestrictions?: any | null,
      locationId: number,
      createdAt: any,
      updatedAt: any,
      evses: Array<{
        id: number,
        stationId?: string | null,
        evseTypeId?: number | null,
        evseId?: string | null,
        ocpiUid?: string | null,
        physicalReference?: string | null,
        removed?: boolean | null,
        createdAt: any,
        updatedAt: any
      }>
    }>
  }>
};

export type GetConnectorByIdQueryVariables = Exact<{
  locationId: Scalars['Int']['input'];
  stationId: Scalars['String']['input'];
  evseId: Scalars['Int']['input'];
  connectorId: Scalars['Int']['input'];
}>;


export type GetConnectorByIdQueryResult = {
  Locations: Array<{
    chargingPool: Array<{
      evses: Array<{
        connectors: Array<{
          id: number,
          stationId: string,
          evseId?: number | null,
          connectorId?: number | null,
          evseTypeConnectorId?: number | null,
          format?: string | null,
          maximumAmperage?: number | null,
          maximumPowerWatts?: number | null,
          maximumVoltage?: number | null,
          powerType?: string | null,
          termsAndConditionsUrl?: string | null,
          type?: string | null,
          status?: string | null,
          errorCode?: string | null,
          timestamp?: any | null,
          info?: string | null,
          vendorId?: string | null,
          vendorErrorCode?: string | null,
          createdAt: any,
          updatedAt: any
        }>
      }>
    }>
  }>
};

export type GetLocationByOcpiIdAndPartnerIdQueryVariables = Exact<{
  id: Scalars['String']['input'];
  partnerId: Scalars['Int']['input'];
}>;


export type GetLocationByOcpiIdAndPartnerIdQueryResult = {
  Locations: Array<{
    ocpiId?: string | null,
    id: number,
    name?: string | null,
    address?: string | null,
    city?: string | null,
    coordinates?: any | null,
    country?: string | null,
    createdAt: any,
    facilities?: any | null,
    openingHours?: any | null,
    parkingType?: string | null,
    postalCode?: string | null,
    publishUpstream?: boolean | null,
    publishAllowedTo?: any | null,
    state?: string | null,
    timeZone?: string | null,
    updatedAt: any,
    operator?: any | null,
    suboperator?: any | null,
    owner?: any | null,
    relatedLocations?: any | null,
    energyMix?: any | null,
    images?: any | null,
    directions?: any | null,
    chargingWhenClosed?: boolean | null,
    tenant: {
      partyId?: string | null,
      countryCode?: string | null
    },
    ownerTenantPartner?: {
      partyId: string,
      countryCode: string
    } | null,
    chargingPool: Array<{
      id: string,
      isOnline?: boolean | null,
      protocol?: string | null,
      capabilities?: any | null,
      chargePointVendor?: string | null,
      chargePointModel?: string | null,
      chargePointSerialNumber?: string | null,
      chargeBoxSerialNumber?: string | null,
      coordinates?: any | null,
      firmwareVersion?: string | null,
      floorLevel?: string | null,
      iccid?: string | null,
      imsi?: string | null,
      meterType?: string | null,
      meterSerialNumber?: string | null,
      parkingRestrictions?: any | null,
      createdAt: any,
      updatedAt: any,
      evses: Array<{
        id: number,
        stationId?: string | null,
        evseTypeId?: number | null,
        evseId?: string | null,
        physicalReference?: string | null,
        capabilities?: any | null,
        directions?: any | null,
        images?: any | null,
        statusSchedule?: any | null,
        ocpiStatus?: string | null,
        ocpiUid?: string | null,
        coordinates?: any | null,
        floorLevel?: string | null,
        parkingRestrictions?: any | null,
        removed?: boolean | null,
        createdAt: any,
        updatedAt: any,
        connectors: Array<{
          id: number,
          ocpiId?: string | null,
          stationId: string,
          evseId?: number | null,
          connectorId?: number | null,
          evseTypeConnectorId?: number | null,
          format?: string | null,
          maximumAmperage?: number | null,
          maximumPowerWatts?: number | null,
          maximumVoltage?: number | null,
          powerType?: string | null,
          termsAndConditionsUrl?: string | null,
          type?: string | null,
          status?: string | null,
          errorCode?: string | null,
          timestamp?: any | null,
          info?: string | null,
          vendorId?: string | null,
          vendorErrorCode?: string | null,
          createdAt: any,
          updatedAt: any,
          deletedAt?: any | null,
          tariffs: Array<{
            id: number,
            tariffOcpiId: string,
            connectorOcpiId: string,
            tariffId: number,
            connectorId: number
          }>
        }>
      }>
    }>
  }>
};

export type GetLocationByOcpiIdPartnerAndRoamingPartnerIdQueryVariables = Exact<{
  id: Scalars['String']['input'];
  partnerId: Scalars['Int']['input'];
  roamingPartnerId: Scalars['Int']['input'];
}>;


export type GetLocationByOcpiIdPartnerAndRoamingPartnerIdQueryResult = {
  Locations: Array<{
    ocpiId?: string | null,
    id: number,
    name?: string | null,
    address?: string | null,
    city?: string | null,
    coordinates?: any | null,
    country?: string | null,
    createdAt: any,
    facilities?: any | null,
    openingHours?: any | null,
    parkingType?: string | null,
    postalCode?: string | null,
    publishUpstream?: boolean | null,
    publishAllowedTo?: any | null,
    state?: string | null,
    timeZone?: string | null,
    updatedAt: any,
    operator?: any | null,
    suboperator?: any | null,
    owner?: any | null,
    relatedLocations?: any | null,
    energyMix?: any | null,
    images?: any | null,
    directions?: any | null,
    chargingWhenClosed?: boolean | null,
    tenant: {
      partyId?: string | null,
      countryCode?: string | null
    },
    ownerTenantPartner?: {
      partyId: string,
      countryCode: string
    } | null,
    chargingPool: Array<{
      id: string,
      isOnline?: boolean | null,
      protocol?: string | null,
      capabilities?: any | null,
      chargePointVendor?: string | null,
      chargePointModel?: string | null,
      chargePointSerialNumber?: string | null,
      chargeBoxSerialNumber?: string | null,
      coordinates?: any | null,
      firmwareVersion?: string | null,
      floorLevel?: string | null,
      iccid?: string | null,
      imsi?: string | null,
      meterType?: string | null,
      meterSerialNumber?: string | null,
      parkingRestrictions?: any | null,
      createdAt: any,
      updatedAt: any,
      evses: Array<{
        id: number,
        stationId?: string | null,
        evseTypeId?: number | null,
        evseId?: string | null,
        physicalReference?: string | null,
        capabilities?: any | null,
        directions?: any | null,
        images?: any | null,
        statusSchedule?: any | null,
        ocpiStatus?: string | null,
        ocpiUid?: string | null,
        coordinates?: any | null,
        floorLevel?: string | null,
        parkingRestrictions?: any | null,
        removed?: boolean | null,
        createdAt: any,
        updatedAt: any,
        connectors: Array<{
          id: number,
          ocpiId?: string | null,
          stationId: string,
          evseId?: number | null,
          connectorId?: number | null,
          evseTypeConnectorId?: number | null,
          format?: string | null,
          maximumAmperage?: number | null,
          maximumPowerWatts?: number | null,
          maximumVoltage?: number | null,
          powerType?: string | null,
          termsAndConditionsUrl?: string | null,
          type?: string | null,
          status?: string | null,
          errorCode?: string | null,
          timestamp?: any | null,
          info?: string | null,
          vendorId?: string | null,
          vendorErrorCode?: string | null,
          createdAt: any,
          updatedAt: any,
          deletedAt?: any | null,
          tariffs: Array<{
            id: number,
            tariffOcpiId: string,
            connectorOcpiId: string,
            tariffId: number,
            connectorId: number
          }>
        }>
      }>
    }>
  }>
};

export type GetEvseByLocationAndOwnerPartnerQueryVariables = Exact<{
  partnerId: Scalars['Int']['input'];
  locationId: Scalars['String']['input'];
  evseId: Scalars['String']['input'];
}>;


export type GetEvseByLocationAndOwnerPartnerQueryResult = {
  Locations: Array<{
    id: number,
    chargingPool: Array<{
      id: string,
      evses: Array<{
        id: number,
        evseId?: string | null
      }>
    }>
  }>
};

export type InsertLocationMutationVariables = Exact<{
  object: Locations_Insert_Input;
}>;


export type InsertLocationMutationResult = {
  insert_Locations_one?: {
    id: number
  } | null
};

export type UpdateLocationMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  set: Locations_Set_Input;
}>;


export type UpdateLocationMutationResult = {
  update_Locations_by_pk?: {
    id: number
  } | null
};

export type UpsertLocationMutationVariables = Exact<{
  object: Locations_Insert_Input;
}>;


export type UpsertLocationMutationResult = {
  insert_Locations_one?: {
    id: number
  } | null
};

export type GetPartnerLocationByOcpiIdQueryVariables = Exact<{
  partnerId: Scalars['Int']['input'];
  locationId: Scalars['String']['input'];
}>;


export type GetPartnerLocationByOcpiIdQueryResult = {
  Locations: Array<{
    id: number,
    tenantId: number,
    openingHours?: any | null
  }>
};

export type UpdateLocationPatchMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  changes: Locations_Set_Input;
}>;


export type UpdateLocationPatchMutationResult = {
  update_Locations_by_pk?: {
    id: number,
    updatedAt: any
  } | null
};

export type GetKnownLocationIdsWithRoamingPartnerIdQueryVariables = Exact<{
  partnerId: Scalars['Int']['input'];
  roamingPartnerId: Scalars['Int']['input'];
}>;


export type GetKnownLocationIdsWithRoamingPartnerIdQueryResult = {
  Locations: Array<{
    ocpiId?: string | null,
    id: number
  }>
};

export type GetKnownLocationIdsQueryVariables = Exact<{
  partnerId: Scalars['Int']['input'];
}>;


export type GetKnownLocationIdsQueryResult = {
  Locations: Array<{
    ocpiId?: string | null,
    id: number
  }>
};

export type MarkLocationRemovedMutationVariables = Exact<{
  locationId: Scalars['Int']['input'];
  deletedAt: Scalars['timestamptz']['input'];
}>;


export type MarkLocationRemovedMutationResult = {
  update_Locations_by_pk?: {
    ocpiId?: string | null,
    id: number
  } | null
};

export type MarkEvseRemovedMutationVariables = Exact<{
  evseId: Scalars['Int']['input'];
}>;


export type MarkEvseRemovedMutationResult = {
  update_Evses_by_pk?: {
    id: number
  } | null
};

export type CreateRoamingPartnerMutationVariables = Exact<{
  countryCode: Scalars['String']['input'];
  partyId: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
}>;


export type CreateRoamingPartnerMutationResult = {
  insert_RoamingPartners_one?: {
    id: number
  } | null
};

export type FindSessionP2pQueryVariables = Exact<{
  ocpiSessionId: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
}>;


export type FindSessionP2pQueryResult = {
  Sessions: Array<{
    id: number
  }>
};

export type FindSessionRoamingQueryVariables = Exact<{
  ocpiSessionId: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
  roamingPartnerId: Scalars['Int']['input'];
}>;


export type FindSessionRoamingQueryResult = {
  Sessions: Array<{
    id: number
  }>
};

export type GetSessionByOcpiIdQueryVariables = Exact<{
  ocpiSessionId: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
}>;


export type GetSessionByOcpiIdQueryResult = {
  Sessions: Array<{
    id: number,
    ocpiSessionId: string,
    countryCode: string,
    partyId: string,
    startDateTime: any,
    endDateTime?: any | null,
    kwh: any,
    cdrToken: any,
    authMethod: string,
    authorizationReference?: string | null,
    locationId: string,
    evseUid: string,
    connectorId: string,
    meterId?: string | null,
    currency: string,
    chargingPeriods?: any | null,
    totalCost?: any | null,
    status: string,
    lastUpdated: any,
    tenantId: number,
    tenantPartnerId: number,
    roamingPartnerId?: number | null,
    createdAt?: any | null,
    updatedAt?: any | null
  }>
};

export type GetSessionByOcpiIdRoamingQueryVariables = Exact<{
  ocpiSessionId: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
  roamingPartnerId: Scalars['Int']['input'];
}>;


export type GetSessionByOcpiIdRoamingQueryResult = {
  Sessions: Array<{
    id: number,
    ocpiSessionId: string,
    countryCode: string,
    partyId: string,
    startDateTime: any,
    endDateTime?: any | null,
    kwh: any,
    cdrToken: any,
    authMethod: string,
    authorizationReference?: string | null,
    locationId: string,
    evseUid: string,
    connectorId: string,
    meterId?: string | null,
    currency: string,
    chargingPeriods?: any | null,
    totalCost?: any | null,
    status: string,
    lastUpdated: any,
    tenantId: number,
    tenantPartnerId: number,
    roamingPartnerId?: number | null,
    createdAt?: any | null,
    updatedAt?: any | null
  }>
};

export type GetSessionsPaginatedQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where: Sessions_Bool_Exp;
}>;


export type GetSessionsPaginatedQueryResult = {
  Sessions: Array<{
    id: number,
    ocpiSessionId: string,
    countryCode: string,
    partyId: string,
    startDateTime: any,
    endDateTime?: any | null,
    kwh: any,
    cdrToken: any,
    authMethod: string,
    authorizationReference?: string | null,
    locationId: string,
    evseUid: string,
    connectorId: string,
    meterId?: string | null,
    currency: string,
    chargingPeriods?: any | null,
    totalCost?: any | null,
    status: string,
    lastUpdated: any,
    tenantId: number,
    tenantPartnerId: number,
    roamingPartnerId?: number | null,
    createdAt?: any | null,
    updatedAt?: any | null
  }>
};

export type InsertSessionMutationVariables = Exact<{
  object: Sessions_Insert_Input;
}>;


export type InsertSessionMutationResult = {
  insert_Sessions_one?: {
    id: number,
    ocpiSessionId: string,
    countryCode: string,
    partyId: string,
    startDateTime: any,
    endDateTime?: any | null,
    kwh: any,
    cdrToken: any,
    authMethod: string,
    authorizationReference?: string | null,
    locationId: string,
    evseUid: string,
    connectorId: string,
    meterId?: string | null,
    currency: string,
    chargingPeriods?: any | null,
    totalCost?: any | null,
    status: string,
    lastUpdated: any,
    tenantId: number,
    tenantPartnerId: number,
    roamingPartnerId?: number | null,
    createdAt?: any | null,
    updatedAt?: any | null
  } | null
};

export type UpdateSessionByPkMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  set: Sessions_Set_Input;
}>;


export type UpdateSessionByPkMutationResult = {
  update_Sessions_by_pk?: {
    id: number,
    ocpiSessionId: string,
    countryCode: string,
    partyId: string,
    startDateTime: any,
    endDateTime?: any | null,
    kwh: any,
    cdrToken: any,
    authMethod: string,
    authorizationReference?: string | null,
    locationId: string,
    evseUid: string,
    connectorId: string,
    meterId?: string | null,
    currency: string,
    chargingPeriods?: any | null,
    totalCost?: any | null,
    status: string,
    lastUpdated: any,
    tenantId: number,
    tenantPartnerId: number,
    roamingPartnerId?: number | null,
    createdAt?: any | null,
    updatedAt?: any | null
  } | null
};

export type UpdateSessionMutationVariables = Exact<{
  ocpiSessionId: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
  set: Sessions_Set_Input;
}>;


export type UpdateSessionMutationResult = {
  update_Sessions?: {
    returning: Array<{
      id: number,
      ocpiSessionId: string,
      countryCode: string,
      partyId: string,
      startDateTime: any,
      endDateTime?: any | null,
      kwh: any,
      cdrToken: any,
      authMethod: string,
      authorizationReference?: string | null,
      locationId: string,
      evseUid: string,
      connectorId: string,
      meterId?: string | null,
      currency: string,
      chargingPeriods?: any | null,
      totalCost?: any | null,
      status: string,
      lastUpdated: any,
      tenantId: number,
      tenantPartnerId: number,
      roamingPartnerId?: number | null,
      createdAt?: any | null,
      updatedAt?: any | null
    }>
  } | null
};

export type GetTariffByKeyQueryVariables = Exact<{
  id: Scalars['Int']['input'];
  countryCode: Scalars['String']['input'];
  partyId: Scalars['String']['input'];
}>;


export type GetTariffByKeyQueryResult = {
  Tariffs: Array<{
    authorizationAmount?: any | null,
    createdAt: any,
    currency: any,
    id: number,
    ocpiTariffId?: string | null,
    paymentFee?: any | null,
    pricePerKwh: any,
    pricePerMin?: any | null,
    pricePerSession?: any | null,
    stationId?: string | null,
    taxRate?: any | null,
    tariffAltText?: string | null,
    tenantPartnerId?: number | null,
    updatedAt: any,
    tenant: {
      countryCode?: string | null,
      partyId?: string | null
    }
  }>
};

export type GetTariffForBroadcastQueryVariables = Exact<{
  id: Scalars['Int']['input'];
  countryCode: Scalars['String']['input'];
  partyId: Scalars['String']['input'];
}>;


export type GetTariffForBroadcastQueryResult = {
  Tariffs: Array<{
    id: number,
    ocpiTariffId?: string | null,
    currency: any,
    updatedAt: any,
    startDateTime?: any | null,
    endDateTime?: any | null,
    tariffType?: string | null,
    tariffAltUrl?: string | null,
    minPrice?: any | null,
    maxPrice?: any | null,
    energyMix?: any | null,
    tariffAltText?: string | null,
    tenantPartnerId?: number | null,
    TariffElements: Array<{
      id: number,
      priceComponents: any,
      restrictions?: any | null
    }>,
    tenant: {
      countryCode?: string | null,
      partyId?: string | null
    }
  }>
};

export type GetTariffsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where: Tariffs_Bool_Exp;
}>;


export type GetTariffsQueryResult = {
  Tariffs: Array<{
    authorizationAmount?: any | null,
    createdAt: any,
    currency: any,
    id: number,
    ocpiTariffId?: string | null,
    tariffAltText?: string | null,
    tenantPartnerId?: number | null,
    updatedAt: any,
    startDateTime?: any | null,
    endDateTime?: any | null,
    tariffType?: string | null,
    tariffAltUrl?: string | null,
    minPrice?: any | null,
    maxPrice?: any | null,
    energyMix?: any | null,
    TariffElements: Array<{
      id: number,
      priceComponents: any,
      restrictions?: any | null
    }>,
    tenant: {
      countryCode?: string | null,
      partyId?: string | null
    }
  }>
};

export type CreateOrUpdateTariffMutationVariables = Exact<{
  object: Tariffs_Insert_Input;
}>;


export type CreateOrUpdateTariffMutationResult = {
  insert_Tariffs_one?: {
    id: number,
    ocpiTariffId?: string | null,
    authorizationAmount?: any | null,
    createdAt: any,
    currency: any,
    paymentFee?: any | null,
    pricePerKwh: any,
    pricePerMin?: any | null,
    pricePerSession?: any | null,
    stationId?: string | null,
    taxRate?: any | null,
    tariffAltText?: string | null,
    tenantPartnerId?: number | null,
    updatedAt: any,
    tariffType?: string | null,
    tariffAltUrl?: string | null,
    minPrice?: any | null,
    maxPrice?: any | null,
    energyMix?: any | null,
    startDateTime?: any | null,
    endDateTime?: any | null,
    tenant: {
      countryCode?: string | null,
      partyId?: string | null
    },
    tenantPartner?: {
      id: number,
      countryCode: string,
      partyId: string
    } | null
  } | null
};

export type CreateOrUpdatePartnerTariffMutationVariables = Exact<{
  object: Tariffs_Insert_Input;
}>;


export type CreateOrUpdatePartnerTariffMutationResult = {
  insert_Tariffs_one?: {
    id: number,
    ocpiTariffId?: string | null,
    authorizationAmount?: any | null,
    createdAt: any,
    currency: any,
    paymentFee?: any | null,
    pricePerKwh: any,
    pricePerMin?: any | null,
    pricePerSession?: any | null,
    stationId?: string | null,
    taxRate?: any | null,
    tariffAltText?: string | null,
    tariffType?: string | null,
    tariffAltUrl?: string | null,
    minPrice?: any | null,
    maxPrice?: any | null,
    energyMix?: any | null,
    startDateTime?: any | null,
    endDateTime?: any | null,
    tenantPartnerId?: number | null,
    updatedAt: any,
    roamingPartnerId?: number | null,
    tenant: {
      countryCode?: string | null,
      partyId?: string | null
    },
    TariffElements: Array<{
      id: number,
      priceComponents: any,
      restrictions?: any | null
    }>,
    tenantPartner?: {
      id: number,
      countryCode: string,
      partyId: string
    } | null
  } | null
};

export type CreateOrUpdatePartnerTariffRoamingPartnerMutationVariables = Exact<{
  object: Tariffs_Insert_Input;
}>;


export type CreateOrUpdatePartnerTariffRoamingPartnerMutationResult = {
  insert_Tariffs_one?: {
    id: number,
    ocpiTariffId?: string | null,
    authorizationAmount?: any | null,
    createdAt: any,
    currency: any,
    paymentFee?: any | null,
    pricePerKwh: any,
    pricePerMin?: any | null,
    pricePerSession?: any | null,
    stationId?: string | null,
    taxRate?: any | null,
    tariffAltText?: string | null,
    tariffType?: string | null,
    tariffAltUrl?: string | null,
    minPrice?: any | null,
    maxPrice?: any | null,
    energyMix?: any | null,
    startDateTime?: any | null,
    endDateTime?: any | null,
    tenantPartnerId?: number | null,
    updatedAt: any,
    roamingPartnerId?: number | null,
    tenant: {
      countryCode?: string | null,
      partyId?: string | null
    },
    TariffElements: Array<{
      id: number,
      priceComponents: any,
      restrictions?: any | null
    }>,
    tenantPartner?: {
      id: number,
      countryCode: string,
      partyId: string
    } | null
  } | null
};

export type DeleteTariffMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteTariffMutationResult = {
  delete_Tariffs_by_pk?: {
    id: number
  } | null
};

export type DeleteTariffByPartnerMutationVariables = Exact<{
  ocpiTariffId: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
}>;


export type DeleteTariffByPartnerMutationResult = {
  delete_Tariffs?: {
    affected_rows: number
  } | null
};

export type DeleteTariffByRoamingPartnerMutationVariables = Exact<{
  ocpiTariffId: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
  roamingPartnerId: Scalars['Int']['input'];
}>;


export type DeleteTariffByRoamingPartnerMutationResult = {
  delete_Tariffs?: {
    affected_rows: number
  } | null
};

export type GetTariffByOcpiIdQueryVariables = Exact<{
  ocpiTariffId: Scalars['String']['input'];
  countryCode: Scalars['String']['input'];
  partyId: Scalars['String']['input'];
}>;


export type GetTariffByOcpiIdQueryResult = {
  Tariffs: Array<{
    authorizationAmount?: any | null,
    createdAt: any,
    currency: any,
    id: number,
    ocpiTariffId?: string | null,
    paymentFee?: any | null,
    pricePerKwh: any,
    pricePerMin?: any | null,
    pricePerSession?: any | null,
    stationId?: string | null,
    taxRate?: any | null,
    tariffAltText?: string | null,
    tariffType?: string | null,
    tariffAltUrl?: string | null,
    minPrice?: any | null,
    maxPrice?: any | null,
    energyMix?: any | null,
    startDateTime?: any | null,
    endDateTime?: any | null,
    tenantPartnerId?: number | null,
    updatedAt: any,
    tenant: {
      countryCode?: string | null,
      partyId?: string | null
    },
    tenantPartner?: {
      id: number,
      countryCode: string,
      partyId: string
    } | null,
    TariffElements: Array<{
      id: number,
      priceComponents: any,
      restrictions?: any | null
    }>
  }>
};

export type GetTariffByPartnerQueryVariables = Exact<{
  ocpiTariffId: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
}>;


export type GetTariffByPartnerQueryResult = {
  Tariffs: Array<{
    authorizationAmount?: any | null,
    createdAt: any,
    currency: any,
    id: number,
    ocpiTariffId?: string | null,
    paymentFee?: any | null,
    pricePerKwh: any,
    pricePerMin?: any | null,
    pricePerSession?: any | null,
    stationId?: string | null,
    taxRate?: any | null,
    tariffAltText?: string | null,
    tariffType?: string | null,
    tariffAltUrl?: string | null,
    minPrice?: any | null,
    maxPrice?: any | null,
    energyMix?: any | null,
    startDateTime?: any | null,
    endDateTime?: any | null,
    tenantPartnerId?: number | null,
    updatedAt: any,
    tenant: {
      countryCode?: string | null,
      partyId?: string | null
    },
    tenantPartner?: {
      id: number,
      countryCode: string,
      partyId: string
    } | null,
    TariffElements: Array<{
      id: number,
      priceComponents: any,
      restrictions?: any | null
    }>
  }>
};

export type GetTariffByPartnerRoamingPartnerQueryVariables = Exact<{
  ocpiTariffId: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
  roamingPartnerId: Scalars['Int']['input'];
}>;


export type GetTariffByPartnerRoamingPartnerQueryResult = {
  Tariffs: Array<{
    authorizationAmount?: any | null,
    createdAt: any,
    currency: any,
    id: number,
    ocpiTariffId?: string | null,
    paymentFee?: any | null,
    pricePerKwh: any,
    pricePerMin?: any | null,
    pricePerSession?: any | null,
    stationId?: string | null,
    taxRate?: any | null,
    tariffAltText?: string | null,
    tariffType?: string | null,
    tariffAltUrl?: string | null,
    minPrice?: any | null,
    maxPrice?: any | null,
    energyMix?: any | null,
    startDateTime?: any | null,
    endDateTime?: any | null,
    tenantPartnerId?: number | null,
    updatedAt: any,
    tenant: {
      countryCode?: string | null,
      partyId?: string | null
    },
    tenantPartner?: {
      id: number,
      countryCode: string,
      partyId: string
    } | null,
    TariffElements: Array<{
      id: number,
      priceComponents: any,
      restrictions?: any | null
    }>
  }>
};

export type DeleteTariffElementsMutationVariables = Exact<{
  tariffId: Scalars['Int']['input'];
}>;


export type DeleteTariffElementsMutationResult = {
  delete_TariffElements?: {
    affected_rows: number
  } | null
};

export type GetTariffIdByOcpiIdQueryVariables = Exact<{
  ocpiTariffId: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
}>;


export type GetTariffIdByOcpiIdQueryResult = {
  Tariffs: Array<{
    id: number
  }>
};

export type FindPartnerTariffQueryVariables = Exact<{
  ocpiTariffId: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
  roamingPartnerId?: InputMaybe<Scalars['Int']['input']>;
}>;


export type FindPartnerTariffQueryResult = {
  Tariffs: Array<{
    id: number
  }>
};

export type FindPartnerTariffP2pQueryVariables = Exact<{
  ocpiTariffId: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
}>;


export type FindPartnerTariffP2pQueryResult = {
  Tariffs: Array<{
    id: number
  }>
};

export type UpdatePartnerTariffByPkMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  set: Tariffs_Set_Input;
}>;


export type UpdatePartnerTariffByPkMutationResult = {
  update_Tariffs_by_pk?: {
    id: number,
    ocpiTariffId?: string | null,
    authorizationAmount?: any | null,
    createdAt: any,
    currency: any,
    paymentFee?: any | null,
    pricePerKwh: any,
    pricePerMin?: any | null,
    pricePerSession?: any | null,
    stationId?: string | null,
    taxRate?: any | null,
    tariffAltText?: string | null,
    tariffType?: string | null,
    tariffAltUrl?: string | null,
    minPrice?: any | null,
    maxPrice?: any | null,
    energyMix?: any | null,
    startDateTime?: any | null,
    endDateTime?: any | null,
    tenantPartnerId?: number | null,
    roamingPartnerId?: number | null,
    updatedAt: any,
    tenant: {
      countryCode?: string | null,
      partyId?: string | null
    },
    tenantPartner?: {
      id: number,
      countryCode: string,
      partyId: string
    } | null,
    TariffElements: Array<{
      id: number,
      priceComponents: any,
      restrictions?: any | null
    }>
  } | null
};

export type InsertPartnerTariffMutationVariables = Exact<{
  object: Tariffs_Insert_Input;
}>;


export type InsertPartnerTariffMutationResult = {
  insert_Tariffs_one?: {
    id: number,
    ocpiTariffId?: string | null,
    authorizationAmount?: any | null,
    createdAt: any,
    currency: any,
    paymentFee?: any | null,
    pricePerKwh: any,
    pricePerMin?: any | null,
    pricePerSession?: any | null,
    stationId?: string | null,
    taxRate?: any | null,
    tariffAltText?: string | null,
    tariffType?: string | null,
    tariffAltUrl?: string | null,
    minPrice?: any | null,
    maxPrice?: any | null,
    energyMix?: any | null,
    startDateTime?: any | null,
    endDateTime?: any | null,
    tenantPartnerId?: number | null,
    roamingPartnerId?: number | null,
    updatedAt: any,
    tenant: {
      countryCode?: string | null,
      partyId?: string | null
    },
    tenantPartner?: {
      id: number,
      countryCode: string,
      partyId: string
    } | null,
    TariffElements: Array<{
      id: number,
      priceComponents: any,
      restrictions?: any | null
    }>
  } | null
};

export type InsertTariffElementsMutationVariables = Exact<{
  objects: Array<TariffElements_Insert_Input> | TariffElements_Insert_Input;
}>;


export type InsertTariffElementsMutationResult = {
  insert_TariffElements?: {
    affected_rows: number
  } | null
};

export type UpdatePartnerTariffMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  set: Tariffs_Set_Input;
}>;


export type UpdatePartnerTariffMutationResult = {
  update_Tariffs_by_pk?: {
    id: number,
    ocpiTariffId?: string | null,
    authorizationAmount?: any | null,
    createdAt: any,
    currency: any,
    paymentFee?: any | null,
    pricePerKwh: any,
    pricePerMin?: any | null,
    pricePerSession?: any | null,
    stationId?: string | null,
    taxRate?: any | null,
    tariffAltText?: string | null,
    tariffType?: string | null,
    tariffAltUrl?: string | null,
    minPrice?: any | null,
    maxPrice?: any | null,
    energyMix?: any | null,
    startDateTime?: any | null,
    endDateTime?: any | null,
    tenantPartnerId?: number | null,
    roamingPartnerId?: number | null,
    updatedAt: any,
    tenant: {
      countryCode?: string | null,
      partyId?: string | null
    },
    tenantPartner?: {
      id: number,
      countryCode: string,
      partyId: string
    } | null,
    TariffElements: Array<{
      id: number,
      priceComponents: any,
      restrictions?: any | null
    }>
  } | null
};

export type GetTariffsPaginatedQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where: Tariffs_Bool_Exp;
}>;


export type GetTariffsPaginatedQueryResult = {
  Tariffs: Array<{
    id: number,
    createdAt: any,
    updatedAt: any,
    authorizationAmount?: any | null,
    currency: any,
    ocpiTariffId?: string | null,
    tariffAltText?: string | null,
    tenantPartnerId?: number | null,
    startDateTime?: any | null,
    endDateTime?: any | null,
    tariffType?: string | null,
    tariffAltUrl?: string | null,
    minPrice?: any | null,
    maxPrice?: any | null,
    energyMix?: any | null,
    tenantPartner?: {
      id: number,
      countryCode: string,
      partyId: string
    } | null,
    TariffElements: Array<{
      id: number,
      priceComponents: any,
      restrictions?: any | null
    }>,
    tenant: {
      countryCode?: string | null,
      partyId?: string | null
    }
  }>
};

export type UpdateTenantPartnerProfileMutationVariables = Exact<{
  partnerId: Scalars['Int']['input'];
  input: Scalars['jsonb']['input'];
}>;


export type UpdateTenantPartnerProfileMutationResult = {
  update_TenantPartners?: {
    affected_rows: number
  } | null
};

export type DeleteTenantPartnerByIdMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteTenantPartnerByIdMutationResult = {
  delete_TenantPartners?: {
    affected_rows: number
  } | null
};

export type GetTenantPartnerByServerTokenQueryVariables = Exact<{
  serverToken: Scalars['String']['input'];
}>;


export type GetTenantPartnerByServerTokenQueryResult = {
  TenantPartners: Array<{
    id: number,
    countryCode: string,
    partyId: string,
    partnerProfileOCPI?: any | null,
    awsSecretCertificateArn?: string | null,
    tenantId: number,
    tenant: {
      id: number,
      countryCode?: string | null,
      partyId?: string | null,
      serverProfileOCPI?: any | null
    },
    roamingPartners: Array<{
      id: number,
      countryCode: string,
      partyId: string
    }>
  }>
};

export type GetTenantPartnerIdByCountryPartyQueryVariables = Exact<{
  countryCode: Scalars['String']['input'];
  partyId: Scalars['String']['input'];
}>;


export type GetTenantPartnerIdByCountryPartyQueryResult = {
  TenantPartners: Array<{
    id: number
  }>
};

export type GetTenantPartnerByIdQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetTenantPartnerByIdQueryResult = {
  TenantPartners_by_pk?: {
    id: number,
    countryCode: string,
    partyId: string,
    partnerProfileOCPI?: any | null,
    awsSecretCertificateArn?: string | null,
    tenantId: number,
    tenant: {
      id: number,
      countryCode?: string | null,
      partyId?: string | null,
      serverProfileOCPI?: any | null
    }
  } | null
};

export type DeleteTenantPartnerByServerTokenMutationVariables = Exact<{
  serverToken: Scalars['String']['input'];
}>;


export type DeleteTenantPartnerByServerTokenMutationResult = {
  delete_TenantPartners?: {
    affected_rows: number
  } | null
};

export type GetTenantPartnerByCpoClientAndModuleIdQueryVariables = Exact<{
  ourCountryCode: Scalars['String']['input'];
  ourPartyId: Scalars['String']['input'];
  partnerCountryCode?: InputMaybe<Scalars['String']['input']>;
  partnerPartyId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetTenantPartnerByCpoClientAndModuleIdQueryResult = {
  TenantPartners: Array<{
    id: number,
    countryCode: string,
    partyId: string,
    partnerProfileOCPI?: any | null,
    awsSecretCertificateArn?: string | null,
    tenantId: number,
    tenant: {
      id: number,
      countryCode?: string | null,
      partyId?: string | null,
      serverProfileOCPI?: any | null
    },
    roamingPartners: Array<{
      id: number,
      countryCode: string,
      partyId: string
    }>
  }>
};

export type TenantPartnersListQueryVariables = Exact<{
  cpoCountryCode: Scalars['String']['input'];
  cpoPartyId: Scalars['String']['input'];
  endpointIdentifier: Scalars['String']['input'];
}>;


export type TenantPartnersListQueryResult = {
  TenantPartners: Array<{
    id: number,
    countryCode: string,
    partyId: string,
    partnerProfileOCPI?: any | null,
    awsSecretCertificateArn?: string | null,
    tenantId: number,
    tenant: {
      id: number,
      countryCode?: string | null,
      partyId?: string | null,
      serverProfileOCPI?: any | null
    }
  }>
};

export type GetTenantByIdQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetTenantByIdQueryResult = {
  Tenants: Array<{
    serverProfileOCPI?: any | null,
    countryCode?: string | null,
    partyId?: string | null
  }>
};

export type ReadAuthorizationsQueryVariables = Exact<{
  idToken?: InputMaybe<Scalars['citext']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  partyId?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReadAuthorizationsQueryResult = {
  Authorizations: Array<{
    id: number,
    createdAt: any,
    updatedAt: any,
    idToken: any,
    idTokenType?: string | null,
    additionalInfo?: any | null,
    status: any,
    realTimeAuth: string,
    language1?: string | null,
    groupAuthorizationId?: number | null,
    tenants: Array<{
      tenantId: number,
      tenant: {
        countryCode?: string | null,
        partyId?: string | null
      }
    }>,
    tenantPartner?: {
      id: number,
      countryCode: string,
      partyId: string
    } | null,
    groupAuthorization?: {
      idToken: any
    } | null
  }>
};

export type UpdateAuthorizationMutationVariables = Exact<{
  idToken: Scalars['citext']['input'];
  type: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
  set?: InputMaybe<Authorizations_Set_Input>;
}>;


export type UpdateAuthorizationMutationResult = {
  update_Authorizations?: {
    returning: Array<{
      id: number,
      createdAt: any,
      updatedAt: any,
      idToken: any,
      idTokenType?: string | null,
      additionalInfo?: any | null,
      status: any,
      realTimeAuth: string,
      language1?: string | null,
      groupAuthorizationId?: number | null,
      tenants: Array<{
        tenantId: number,
        tenant: {
          countryCode?: string | null,
          partyId?: string | null
        }
      }>,
      tenantPartner?: {
        id: number,
        countryCode: string,
        partyId: string
      } | null,
      groupAuthorization?: {
        idToken: any
      } | null
    }>
  } | null
};

export type GetAuthorizationByTokenQueryVariables = Exact<{
  idToken: Scalars['citext']['input'];
  idTokenType: Scalars['String']['input'];
  tenantPartnerId: Scalars['Int']['input'];
}>;


export type GetAuthorizationByTokenQueryResult = {
  Authorizations: Array<{
    id: number,
    idToken: any,
    idTokenType?: string | null,
    additionalInfo?: any | null,
    groupAuthorizationId?: number | null,
    status: any,
    realTimeAuth: string,
    language1?: string | null,
    createdAt: any,
    updatedAt: any,
    tenantPartner?: {
      id: number,
      countryCode: string,
      partyId: string
    } | null,
    groupAuthorization?: {
      idToken: any
    } | null,
    tenants: Array<{
      tenantId: number,
      tenant: {
        countryCode?: string | null,
        partyId?: string | null
      }
    }>
  }>
};

export type GetAuthorizationByIdQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetAuthorizationByIdQueryResult = {
  Authorizations_by_pk?: {
    id: number,
    idToken: any,
    idTokenType?: string | null,
    additionalInfo?: any | null,
    groupAuthorizationId?: number | null,
    status: any,
    realTimeAuth: string,
    language1?: string | null,
    createdAt: any,
    updatedAt: any,
    tenants: Array<{
      tenantId: number,
      tenant: {
        countryCode?: string | null,
        partyId?: string | null
      }
    }>,
    tenantPartner?: {
      id: number,
      countryCode: string,
      partyId: string
    } | null,
    groupAuthorization?: {
      idToken: any
    } | null
  } | null
};

export type CreateAuthorizationMutationVariables = Exact<{
  tenantId: Scalars['Int']['input'];
  tenantPartnerId: Scalars['Int']['input'];
  idToken: Scalars['citext']['input'];
  idTokenType: Scalars['String']['input'];
  additionalInfo?: InputMaybe<Scalars['jsonb']['input']>;
  status: Scalars['authorization_status']['input'];
  language1?: InputMaybe<Scalars['String']['input']>;
  groupAuthorizationId?: InputMaybe<Scalars['Int']['input']>;
  realTimeAuth?: InputMaybe<Scalars['String']['input']>;
  createdAt: Scalars['timestamptz']['input'];
  updatedAt: Scalars['timestamptz']['input'];
}>;


export type CreateAuthorizationMutationResult = {
  insert_Authorizations_one?: {
    id: number,
    createdAt: any,
    updatedAt: any,
    idToken: any,
    idTokenType?: string | null,
    additionalInfo?: any | null,
    status: any,
    realTimeAuth: string,
    language1?: string | null,
    groupAuthorizationId?: number | null,
    tenants: Array<{
      tenantId: number,
      tenant: {
        countryCode?: string | null,
        partyId?: string | null
      }
    }>,
    tenantPartner?: {
      id: number,
      countryCode: string,
      partyId: string
    } | null,
    groupAuthorization?: {
      idToken: any
    } | null
  } | null
};

export type GetAuthorizationsPaginatedQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where: Authorizations_Bool_Exp;
}>;


export type GetAuthorizationsPaginatedQueryResult = {
  Authorizations: Array<{
    id: number,
    createdAt: any,
    updatedAt: any,
    idToken: any,
    idTokenType?: string | null,
    additionalInfo?: any | null,
    status: any,
    realTimeAuth: string,
    language1?: string | null,
    groupAuthorizationId?: number | null,
    tenantPartner?: {
      id: number,
      countryCode: string,
      partyId: string
    } | null,
    tenants: Array<{
      tenantId: number,
      tenant: {
        countryCode?: string | null,
        partyId?: string | null
      }
    }>,
    groupAuthorization?: {
      idToken: any
    } | null
  }>
};

export type GetGroupAuthorizationQueryVariables = Exact<{
  groupId: Scalars['citext']['input'];
  tenantPartnerId: Scalars['Int']['input'];
}>;


export type GetGroupAuthorizationQueryResult = {
  Authorizations: Array<{
    id: number,
    idToken: any,
    idTokenType?: string | null
  }>
};

export type GetTransactionsQueryVariables = Exact<{
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  where: Transactions_Bool_Exp;
}>;


export type GetTransactionsQueryResult = {
  Transactions: Array<{
    id: number,
    stationId?: string | null,
    transactionId?: string | null,
    isActive?: boolean | null,
    chargingState?: string | null,
    timeSpentCharging?: any | null,
    totalKwh?: any | null,
    stoppedReason?: string | null,
    remoteStartId?: number | null,
    totalCost?: any | null,
    startTime?: any | null,
    endTime?: any | null,
    createdAt: any,
    updatedAt: any,
    evseId?: number | null,
    connectorId?: number | null,
    locationId?: number | null,
    authorizationId?: number | null,
    tariffId?: number | null,
    transactionEvents: Array<{
      id: number,
      eventType?: string | null,
      transactionInfo?: any | null,
      EvseType?: {
        id?: number | null
      } | null
    }>,
    startTransaction?: {
      timestamp?: any | null
    } | null,
    stopTransaction?: {
      timestamp?: any | null
    } | null,
    meterValues: Array<{
      timestamp?: any | null,
      sampledValue?: any | null
    }>
  }>
};

export type GetTransactionByTransactionIdQueryVariables = Exact<{
  transactionId: Scalars['String']['input'];
}>;


export type GetTransactionByTransactionIdQueryResult = {
  Transactions: Array<{
    id: number,
    stationId?: string | null,
    transactionId?: string | null,
    isActive?: boolean | null,
    chargingState?: string | null,
    timeSpentCharging?: any | null,
    totalKwh?: any | null,
    stoppedReason?: string | null,
    remoteStartId?: number | null,
    totalCost?: any | null,
    startTime?: any | null,
    endTime?: any | null,
    createdAt: any,
    updatedAt: any,
    evseId?: number | null,
    connectorId?: number | null,
    locationId?: number | null,
    authorizationId?: number | null,
    tariffId?: number | null,
    tenant: {
      countryCode?: string | null,
      partyId?: string | null
    },
    authorization?: {
      tenantPartner?: {
        id: number,
        countryCode: string,
        partyId: string,
        partnerProfileOCPI?: any | null,
        tenant: {
          id: number,
          countryCode?: string | null,
          partyId?: string | null
        }
      } | null
    } | null,
    chargingStation?: {
      id: string
    } | null,
    transactionEvents: Array<{
      id: number,
      eventType?: string | null,
      transactionInfo?: any | null,
      EvseType?: {
        id?: number | null
      } | null
    }>,
    startTransaction?: {
      timestamp?: any | null
    } | null,
    stopTransaction?: {
      timestamp?: any | null
    } | null,
    meterValues: Array<{
      timestamp?: any | null,
      sampledValue?: any | null
    }>
  }>
};
