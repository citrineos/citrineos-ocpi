// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-request';

export const UPSERT_EVSE_MUTATION = gql`
  mutation UpsertEvse($object: Evses_insert_input!) {
    insert_Evses_one(
      object: $object
      on_conflict: {
        constraint: evses_ocpi_uid_station_unique
        update_columns: [
          evseId
          physicalReference
          capabilities
          floorLevel
          coordinates
          parkingRestrictions
          statusSchedule
          images
          directions
          updatedAt
          ocpiStatus
        ]
      }
    ) {
      id
      ocpiUid
    }
  }
`;

export const GET_PARTNER_EVSE_BY_OCPI_ID = gql`
  query GetPartnerEvseByOcpiIds(
    $partnerId: Int!
    $locationId: String!
    $evseUid: String!
  ) {
    Locations(
      where: {
        ocpiId: { _eq: $locationId }
        ownerTenantPartnerId: { _eq: $partnerId }
        roamingPartnerId: { _is_null: true }
      }
    ) {
      id
      chargingPool: ChargingStations {
        evses: Evses(where: { ocpiUid: { _eq: $evseUid } }) {
          id
        }
      }
    }
  }
`;

export const GET_PARTNER_EVSE_BY_OCPI_ID_AND_ROAMING_PARTNER_ID_QUERY = gql`
  query GetPartnerEvseByOcpiIdAndRoamingPartnerId(
    $partnerId: Int!
    $locationId: String!
    $evseUid: String!
    $roamingPartnerId: Int!
  ) {
    Locations(
      where: {
        ocpiId: { _eq: $locationId }
        ownerTenantPartnerId: { _eq: $partnerId }
        roamingPartnerId: { _eq: $roamingPartnerId }
      }
    ) {
      id
      chargingPool: ChargingStations {
        evses: Evses(where: { ocpiUid: { _eq: $evseUid } }) {
          id
        }
      }
    }
  }
`;

export const UPDATE_EVSE_PATCH_MUTATION = gql`
  mutation UpdateEvsePatch($id: Int!, $changes: Evses_set_input!) {
    update_Evses_by_pk(pk_columns: { id: $id }, _set: $changes) {
      id
      updatedAt
    }
  }
`;

export const GET_EVSE_BY_OCPI_ID_AND_PARTNER_ID_QUERY = gql`
  query GetEvseByOcpiIdAndPartnerId(
    $partnerId: Int!
    $locationId: String!
    $evseUid: String!
  ) {
    Evses(
      where: {
        ocpiUid: { _eq: $evseUid }
        ChargingStation: {
          Location: {
            ocpiId: { _eq: $locationId }
            ownerTenantPartnerId: { _eq: $partnerId }
          }
        }
      }
    ) {
      id
      stationId
      evseTypeId
      evseId
      ocpiUid
      physicalReference
      removed
      createdAt
      updatedAt
      floorLevel
      capabilities
      parkingRestrictions
      statusSchedule
      images
      directions
      coordinates
      ocpiStatus
      ChargingStation {
        id
        location: Location {
          id
          ocpiId
          ownerTenantPartnerId
          updatedAt
        }
      }
      connectors: Connectors {
        id
        evseId
        ocpiId
        stationId
        connectorId
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
        createdAt
        updatedAt
        tariffs: ConnectorTariffsOcpiPartner {
          id
          tariffOcpiId
          connectorOcpiId
          tariffId
          connectorId
        }
      }
    }
  }
`;

export const GET_EVSE_BY_OCPI_ID_PARTNER_AND_ROAMING_PARTNER_ID_QUERY = gql`
  query GetEvseByOcpiIdPartnerAndRoamingPartnerId(
    $partnerId: Int!
    $locationId: String!
    $evseUid: String!
    $roamingPartnerId: Int!
  ) {
    Evses(
      where: {
        ocpiUid: { _eq: $evseUid }
        ChargingStation: {
          Location: {
            ocpiId: { _eq: $locationId }
            ownerTenantPartnerId: { _eq: $partnerId }
            roamingPartnerId: { _eq: $roamingPartnerId }
          }
        }
      }
    ) {
      id
      stationId
      evseTypeId
      evseId
      ocpiUid
      physicalReference
      removed
      createdAt
      updatedAt
      floorLevel
      capabilities
      parkingRestrictions
      statusSchedule
      images
      directions
      coordinates
      ocpiStatus
      ChargingStation {
        id
        location: Location {
          id
          ocpiId
          ownerTenantPartnerId
          roamingPartnerId
          updatedAt
        }
      }
      connectors: Connectors {
        id
        evseId
        ocpiId
        stationId
        connectorId
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
        createdAt
        updatedAt
        tariffs: ConnectorTariffsOcpiPartner {
          id
          tariffOcpiId
          connectorOcpiId
          tariffId
          connectorId
        }
      }
    }
  }
`;
