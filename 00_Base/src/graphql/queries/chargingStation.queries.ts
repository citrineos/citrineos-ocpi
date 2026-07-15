// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-request';

export const GET_CHARGING_STATION_BY_ID_QUERY = gql`
  query GetChargingStationById($id: String!) {
    ChargingStations(where: { id: { _eq: $id } }) {
      id
      tenantId
      isOnline
      protocol
      chargePointVendor
      chargePointModel
      chargePointSerialNumber
      chargeBoxSerialNumber
      firmwareVersion
      iccid
      imsi
      meterType
      meterSerialNumber
      locationId
      createdAt
      updatedAt
      evses: Evses {
        id
        tenantId
        stationId
        evseTypeId
        evseId
        physicalReference
        removed
        createdAt
        updatedAt
        evseTypeId
      }
      connectors: Connectors {
        id
        tenantId
        stationId
        evseId
        connectorId
        evseTypeConnectorId
        status
        errorCode
        timestamp
        info
        vendorId
        vendorErrorCode
        createdAt
        updatedAt
      }
      activeTransactions: Transactions(where: { isActive: { _eq: true } }) {
        id
        connectorId
        evseId
      }
      tenant: Tenant {
        partyId
        countryCode
      }
    }
  }
`;

export const GET_CHARGING_STATION_BY_LOCATION_ID_AND_OWNER_PARTNER_ID = gql`
  query GetChargingStationByLocationAndOwnerPartner(
    $locationId: Int!
    $partnerId: Int!
  ) {
    ChargingStations(
      where: {
        locationId: { _eq: $locationId }
        Location: { ownerTenantPartnerId: { _eq: $partnerId } }
      }
    ) {
      id
    }
  }
`;

export const INSERT_CHARGING_STATION_MUTATION = gql`
  mutation InsertChargingStation($object: ChargingStations_insert_input!) {
    insert_ChargingStations_one(object: $object) {
      id
      locationId
    }
  }
`;
