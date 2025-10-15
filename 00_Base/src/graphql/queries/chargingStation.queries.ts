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
      tenant: Tenant {
        partyId
        countryCode
      }
    }
  }
`;
