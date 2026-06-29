// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-request';

export const UPSERT_CONNECTOR_MUTATION = gql`
  mutation UpsertConnector($object: Connectors_insert_input!) {
    insert_Connectors_one(
      object: $object
      on_conflict: {
        constraint: connectors_ocpi_id_evse_unique
        update_columns: [
          type
          format
          powerType
          maximumVoltage
          maximumAmperage
          maximumPowerWatts
          termsAndConditionsUrl
          updatedAt
        ]
      }
    ) {
      id
      ocpiId
    }
  }
`;

export const GET_PARTNER_CONNECTOR_BY_OCPI_ID_AND_EVSE_ID = gql`
  query GetPartnerConnectorByOcpiIdAndEvseId(
    $partnerId: Int!
    $locationId: String!
    $evseUid: String!
    $connectorId: String!
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
        id
        evses: Evses(where: { ocpiUid: { _eq: $evseUid } }) {
          id
          connectors: Connectors(where: { ocpiId: { _eq: $connectorId } }) {
            id
          }
        }
      }
    }
  }
`;

export const GET_PARTNER_CONNECTOR_BY_OCPI_ID_AND_EVSE_ID_AND_ROAMING_PARTNER_ID = gql`
  query GetPartnerConnectorByOcpiIdAndEvseIdAndRoamingPartnerId(
    $partnerId: Int!
    $locationId: String!
    $evseUid: String!
    $connectorId: String!
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
        id
        evses: Evses(where: { ocpiUid: { _eq: $evseUid } }) {
          id
          connectors: Connectors(where: { ocpiId: { _eq: $connectorId } }) {
            id
          }
        }
      }
    }
  }
`;

export const GET_CONNECTOR_BY_OCPI_ID_AND_EVSE_ID_AND_ROAMING_PARTNER_ID = gql`
  query GetConnectorByOcpiIdAndEvseIdAndRoamingPartnerId(
    $partnerId: Int!
    $locationId: String!
    $evseUid: String!
    $connectorId: String!
    $roamingPartnerId: Int!
  ) {
    Connectors(
      where: {
        ocpiId: { _eq: $connectorId }
        Evse: {
          ocpiUid: { _eq: $evseUid }
          ChargingStation: {
            Location: {
              ocpiId: { _eq: $locationId }
              ownerTenantPartnerId: { _eq: $partnerId }
              roamingPartnerId: { _eq: $roamingPartnerId }
            }
          }
        }
      }
    ) {
      id
      ocpiId
      evseId
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
`;

export const GET_CONNECTOR_BY_OCPI_ID_AND_EVSE_ID = gql`
  query GetConnectorByOcpiIdAndEvseId(
    $partnerId: Int!
    $locationId: String!
    $evseUid: String!
    $connectorId: String!
  ) {
    Connectors(
      where: {
        ocpiId: { _eq: $connectorId }
        Evse: {
          ocpiUid: { _eq: $evseUid }
          ChargingStation: {
            Location: {
              ocpiId: { _eq: $locationId }
              ownerTenantPartnerId: { _eq: $partnerId }
            }
          }
        }
      }
    ) {
      id
      ocpiId
      evseId
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
`;

export const UPDATE_CONNECTOR_PATCH_MUTATION = gql`
  mutation UpdateConnectorPatch($id: Int!, $changes: Connectors_set_input!) {
    update_Connectors_by_pk(pk_columns: { id: $id }, _set: $changes) {
      id
      updatedAt
    }
  }
`;

export const UPSERT_CONNECTOR_TARIFF_OCPIPARTNER_MUTATION = gql`
  mutation UpsertConnectorTariffOcpiPartner(
    $object: ConnectorTariffs_insert_input!
  ) {
    insert_ConnectorTariffs_one(object: $object) {
      id
    }
  }
`;

export const DELETE_OCPI_CONNECTOR_TARIFF_MUTATION = gql`
  mutation DeleteOcpiConnectorTariff(
    $connectorId: Int!
    $connectorOcpiId: String!
  ) {
    delete_ConnectorTariffs(
      where: {
        connectorId: { _eq: $connectorId }
        connectorOcpiId: { _eq: $connectorOcpiId }
      }
    ) {
      affected_rows
    }
  }
`;

export const MARK_CONNECTOR_DELETED_QUERY = gql`
  mutation MarkConnectorDeleted($connectorId: Int!, $deletedAt: timestamptz!) {
    update_Connectors_by_pk(
      pk_columns: { id: $connectorId }
      _set: { deletedAt: $deletedAt }
    ) {
      id
    }
  }
`;
