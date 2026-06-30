// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-request';

export const GET_OUR_LOCATIONS_QUERY = gql`
  query GetOurLocations(
    $limit: Int
    $offset: Int
    $where: Locations_bool_exp!
  ) {
    Locations_aggregate(where: $where) {
      aggregate {
        count
      }
    }
    Locations(
      offset: $offset
      limit: $limit
      order_by: { createdAt: asc }
      where: $where
    ) {
      id
      name
      address
      city
      coordinates
      country
      createdAt
      facilities
      openingHours
      parkingType
      postalCode
      publishUpstream
      state
      timeZone
      updatedAt
      tenant: Tenant {
        name
        isUserTenant
        partyId
        countryCode
      }
      chargingPool: ChargingStations {
        id
        isOnline
        protocol
        capabilities
        chargePointVendor
        chargePointModel
        chargePointSerialNumber
        chargeBoxSerialNumber
        coordinates
        firmwareVersion
        floorLevel
        iccid
        imsi
        meterType
        meterSerialNumber
        parkingRestrictions
        locationId
        createdAt
        updatedAt
        evses: Evses {
          id
          stationId
          evseTypeId
          evseId
          physicalReference
          removed
          createdAt
          updatedAt
          connectors: Connectors {
            id
            stationId
            evseId
            connectorId
            evseTypeConnectorId
            format
            maximumAmperage
            maximumPowerWatts
            maximumVoltage
            powerType
            termsAndConditionsUrl
            type
            status
            errorCode
            timestamp
            info
            vendorId
            vendorErrorCode
            createdAt
            updatedAt
            tariffs: ConnectorTariffs(
              where: { tenantPartnerId: { _is_null: true } }
            ) {
              tariffOcpiId
              tariffId
              Tariff {
                ocpiTariffId
                id
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_OUR_LOCATION_BY_ID_QUERY = gql`
  query GetOurLocationById($id: Int!) {
    Locations(where: { id: { _eq: $id } }) {
      id
      name
      address
      city
      coordinates
      country
      createdAt
      facilities
      openingHours
      parkingType
      postalCode
      publishUpstream
      state
      timeZone
      updatedAt
      tenant: Tenant {
        name
        isUserTenant
        partyId
        countryCode
      }
      chargingPool: ChargingStations {
        id
        isOnline
        protocol
        capabilities
        chargePointVendor
        chargePointModel
        chargePointSerialNumber
        chargeBoxSerialNumber
        coordinates
        firmwareVersion
        floorLevel
        iccid
        imsi
        meterType
        meterSerialNumber
        parkingRestrictions
        locationId
        createdAt
        updatedAt
        evses: Evses {
          id
          stationId
          evseTypeId
          evseId
          physicalReference
          removed
          createdAt
          updatedAt
          connectors: Connectors {
            id
            stationId
            evseId
            connectorId
            evseTypeConnectorId
            format
            maximumAmperage
            maximumPowerWatts
            maximumVoltage
            powerType
            termsAndConditionsUrl
            type
            status
            errorCode
            timestamp
            info
            vendorId
            vendorErrorCode
            createdAt
            updatedAt
            tariffs: ConnectorTariffs(
              where: { tenantPartnerId: { _is_null: true } }
            ) {
              tariffOcpiId
              tariffId
              Tariff {
                ocpiTariffId
                id
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_LOCATION_BY_OCPID_ID_QUERY = gql`
  query GetLocationByOcpiId($id: String!) {
    Locations(where: { ocpiId: { _eq: $id } }) {
      id
      name
      address
      city
      coordinates
      country
      createdAt
      facilities
      openingHours
      parkingType
      postalCode
      publishUpstream
      state
      timeZone
      updatedAt
      tenant: Tenant {
        partyId
        countryCode
      }
      chargingPool: ChargingStations {
        id
        isOnline
        protocol
        capabilities
        chargePointVendor
        chargePointModel
        chargePointSerialNumber
        chargeBoxSerialNumber
        coordinates
        firmwareVersion
        floorLevel
        iccid
        imsi
        meterType
        meterSerialNumber
        parkingRestrictions
        locationId
        createdAt
        updatedAt
        evses: Evses {
          id
          stationId
          evseTypeId
          evseId
          ocpiUid
          physicalReference
          removed
          createdAt
          updatedAt
          connectors: Connectors {
            id
            stationId
            evseId
            connectorId
            evseTypeConnectorId
            format
            maximumAmperage
            maximumPowerWatts
            maximumVoltage
            powerType
            termsAndConditionsUrl
            type
            status
            errorCode
            timestamp
            info
            vendorId
            vendorErrorCode
            createdAt
            updatedAt
            tariffs: ConnectorTariffs {
              id
              tariffOcpiId
              connectorOcpiId
              tariffId
              connectorId
            }
          }
        }
      }
    }
  }
`;

export const GET_EVSE_BY_ID_QUERY = gql`
  query GetEvseById($locationId: Int!, $stationId: String!, $evseId: Int!) {
    Locations(where: { id: { _eq: $locationId } }) {
      chargingPool: ChargingStations(where: { id: { _eq: $stationId } }) {
        id
        isOnline
        protocol
        capabilities
        chargePointVendor
        chargePointModel
        chargePointSerialNumber
        chargeBoxSerialNumber
        coordinates
        firmwareVersion
        floorLevel
        iccid
        imsi
        meterType
        meterSerialNumber
        parkingRestrictions
        locationId
        createdAt
        updatedAt
        evses: Evses(where: { id: { _eq: $evseId } }) {
          id
          stationId
          evseTypeId
          evseId
          ocpiUid
          physicalReference
          removed
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const GET_CONNECTOR_BY_ID_QUERY = gql`
  query GetConnectorById(
    $locationId: Int!
    $stationId: String!
    $evseId: Int!
    $connectorId: Int!
  ) {
    Locations(where: { id: { _eq: $locationId } }) {
      chargingPool: ChargingStations(where: { id: { _eq: $stationId } }) {
        evses: Evses(where: { id: { _eq: $evseId } }) {
          connectors: Connectors(
            where: { connectorId: { _eq: $connectorId } }
          ) {
            id
            stationId
            evseId
            connectorId
            evseTypeConnectorId
            format
            maximumAmperage
            maximumPowerWatts
            maximumVoltage
            powerType
            termsAndConditionsUrl
            type
            status
            errorCode
            timestamp
            info
            vendorId
            vendorErrorCode
            createdAt
            updatedAt
          }
        }
      }
    }
  }
`;

export const GET_LOCATION_BY_OCPI_ID_AND_PARTNER_ID_QUERY = gql`
  query GetLocationByOcpiIdAndPartnerId($id: String!, $partnerId: Int!) {
    Locations(
      where: { ocpiId: { _eq: $id }, ownerTenantPartnerId: { _eq: $partnerId } }
    ) {
      ocpiId
      id
      name
      address
      city
      coordinates
      country
      createdAt
      facilities
      openingHours
      parkingType
      postalCode
      publishUpstream
      publishAllowedTo
      state
      timeZone
      updatedAt
      tenant: Tenant {
        partyId
        countryCode
      }
      ownerTenantPartner: OwnerTenantPartner {
        partyId
        countryCode
      }
      operator
      suboperator
      owner
      relatedLocations
      energyMix
      images
      directions
      chargingWhenClosed
      chargingPool: ChargingStations {
        id
        isOnline
        protocol
        capabilities
        chargePointVendor
        chargePointModel
        chargePointSerialNumber
        chargeBoxSerialNumber
        coordinates
        firmwareVersion
        floorLevel
        iccid
        imsi
        meterType
        meterSerialNumber
        parkingRestrictions
        createdAt
        updatedAt
        evses: Evses {
          id
          stationId
          evseTypeId
          evseId
          physicalReference
          capabilities
          directions
          images
          statusSchedule
          ocpiStatus
          ocpiUid
          coordinates
          floorLevel
          parkingRestrictions
          removed
          createdAt
          updatedAt
          connectors: Connectors {
            id
            ocpiId
            stationId
            evseId
            connectorId
            evseTypeConnectorId
            format
            maximumAmperage
            maximumPowerWatts
            maximumVoltage
            powerType
            termsAndConditionsUrl
            type
            status
            errorCode
            timestamp
            info
            vendorId
            vendorErrorCode
            createdAt
            updatedAt
            deletedAt
            tariffs: ConnectorTariffs {
              id
              tariffOcpiId
              connectorOcpiId
              tariffId
              connectorId
            }
          }
        }
      }
    }
  }
`;

export const GET_LOCATION_BY_OCPI_ID_PARTNER_AND_ROAMING_PARTNER_ID_QUERY = gql`
  query GetLocationByOcpiIdPartnerAndRoamingPartnerId(
    $id: String!
    $partnerId: Int!
    $roamingPartnerId: Int!
  ) {
    Locations(
      where: {
        ocpiId: { _eq: $id }
        ownerTenantPartnerId: { _eq: $partnerId }
        roamingPartnerId: { _eq: $roamingPartnerId }
      }
    ) {
      ocpiId
      id
      name
      address
      city
      coordinates
      country
      createdAt
      facilities
      openingHours
      parkingType
      postalCode
      publishUpstream
      publishAllowedTo
      state
      timeZone
      updatedAt
      tenant: Tenant {
        partyId
        countryCode
      }
      ownerTenantPartner: OwnerTenantPartner {
        partyId
        countryCode
      }
      operator
      suboperator
      owner
      relatedLocations
      energyMix
      images
      directions
      chargingWhenClosed
      chargingPool: ChargingStations {
        id
        isOnline
        protocol
        capabilities
        chargePointVendor
        chargePointModel
        chargePointSerialNumber
        chargeBoxSerialNumber
        coordinates
        firmwareVersion
        floorLevel
        iccid
        imsi
        meterType
        meterSerialNumber
        parkingRestrictions
        createdAt
        updatedAt
        evses: Evses {
          id
          stationId
          evseTypeId
          evseId
          physicalReference
          capabilities
          directions
          images
          statusSchedule
          ocpiStatus
          ocpiUid
          coordinates
          floorLevel
          parkingRestrictions
          removed
          createdAt
          updatedAt
          connectors: Connectors {
            id
            ocpiId
            stationId
            evseId
            connectorId
            evseTypeConnectorId
            format
            maximumAmperage
            maximumPowerWatts
            maximumVoltage
            powerType
            termsAndConditionsUrl
            type
            status
            errorCode
            timestamp
            info
            vendorId
            vendorErrorCode
            createdAt
            updatedAt
            deletedAt
            tariffs: ConnectorTariffs {
              id
              tariffOcpiId
              connectorOcpiId
              tariffId
              connectorId
            }
          }
        }
      }
    }
  }
`;

export const GET_EVSE_BY_LOCATION_ID_AND_OWNER_PARTNER_ID = gql`
  query GetEvseByLocationAndOwnerPartner(
    $partnerId: Int!
    $locationId: String!
    $evseId: String!
  ) {
    Locations(
      where: {
        ocpiId: { _eq: $locationId }
        ownerTenantPartnerId: { _eq: $partnerId }
      }
    ) {
      id
      chargingPool: ChargingStations {
        id
        evses: Evses(where: { evseId: { _eq: $evseId } }) {
          id
          evseId
        }
      }
    }
  }
`;

export const INSERT_LOCATION_MUTATION = gql`
  mutation InsertLocation($object: Locations_insert_input!) {
    insert_Locations_one(object: $object) {
      id
    }
  }
`;

export const UPDATE_LOCATION_MUTATION = gql`
  mutation UpdateLocation($id: Int!, $set: Locations_set_input!) {
    update_Locations_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`;

export const UPSERT_LOCATION_MUTATION = gql`
  mutation UpsertLocation($object: Locations_insert_input!) {
    insert_Locations_one(
      object: $object
      on_conflict: {
        constraint: locations_ocpi_id_partner_unique
        update_columns: [
          name
          address
          city
          country
          postalCode
          state
          parkingType
          timeZone
          coordinates
          operator
          suboperator
          owner
          chargingWhenClosed
          relatedLocations
          publishUpstream
          publishAllowedTo
          energyMix
          openingHours
          facilities
          images
          directions
          updatedAt
        ]
      }
    ) {
      id
    }
  }
`;

export const GET_PARTNER_LOCATION_BY_OCPI_ID = gql`
  query GetPartnerLocationByOcpiId($partnerId: Int!, $locationId: String!) {
    Locations(
      where: {
        ocpiId: { _eq: $locationId }
        ownerTenantPartnerId: { _eq: $partnerId }
        roamingPartnerId: { _is_null: true }
      }
    ) {
      id
      tenantId
      openingHours
    }
  }
`;

export const UPDATE_LOCATION_PATCH_MUTATION = gql`
  mutation UpdateLocationPatch($id: Int!, $changes: Locations_set_input!) {
    update_Locations_by_pk(pk_columns: { id: $id }, _set: $changes) {
      id
      updatedAt
    }
  }
`;

export const GET_KNOWN_LOCATION_IDS_QUERY_WITH_ROAMING_PARTNER_ID = gql`
  query GetKnownLocationIdsWithRoamingPartnerId(
    $partnerId: Int!
    $roamingPartnerId: Int!
  ) {
    Locations(
      where: {
        ownerTenantPartnerId: { _eq: $partnerId }
        roamingPartnerId: { _eq: $roamingPartnerId }
      }
    ) {
      ocpiId
      id
    }
  }
`;

export const GET_KNOWN_LOCATION_IDS_QUERY = gql`
  query GetKnownLocationIds($partnerId: Int!) {
    Locations(where: { ownerTenantPartnerId: { _eq: $partnerId } }) {
      ocpiId
      id
    }
  }
`;

export const MARK_LOCATION_REMOVED_QUERY = gql`
  mutation MarkLocationRemoved($locationId: Int!, $deletedAt: timestamptz!) {
    update_Locations_by_pk(
      pk_columns: { id: $locationId }
      _set: { deletedAt: $deletedAt }
    ) {
      ocpiId
      id
    }
  }
`;

export const MARK_EVSE_REMOVED_QUERY = gql`
  mutation MarkEvseRemoved($evseId: Int!) {
    update_Evses_by_pk(
      pk_columns: { id: $evseId }
      _set: { ocpiStatus: "REMOVED" }
    ) {
      id
    }
  }
`;
