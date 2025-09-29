// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-request';

export const GET_LOCATIONS_QUERY = gql`
  query GetLocations($limit: Int, $offset: Int, $where: Locations_bool_exp!) {
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
          }
        }
      }
    }
  }
`;

export const GET_LOCATION_BY_ID_QUERY = gql`
  query GetLocationById($id: Int!) {
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
      tenantId
      isPublished
      validationErrors
      publishedToPartners
      lastPublicationAttempt
      tenant: Tenant {
        id
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
          isPublished
          validationErrors
          publishedToPartners
          lastPublicationAttempt
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
            isPublished
            validationErrors
            publishedToPartners
            lastPublicationAttempt
          }
        }
      }
    }
  }
`;

export const GET_EVSE_HIERARCHY_BY_ID_QUERY = gql`
  query GetEvseHierarchyById($id: Int!) {
    Evses(where: { id: { _eq: $id } }) {
      id
      stationId
      evseTypeId
      evseId
      physicalReference
      removed
      createdAt
      updatedAt
      isPublished
      lastPublicationAttempt
      chargingStation: ChargingStation {
        id
        stationId
        locationId
        location: Location {
          id
          tenantId
          tenant: Tenant {
            id
            partyId
            countryCode
          }
        }
      }
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
        isPublished
        lastPublicationAttempt
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

export const UPDATE_LOCATION_PUBLICATION_STATUS_MUTATION = gql`
  mutation UpdateLocationPublicationStatus(
    $id: Int!
    $isPublished: Boolean!
    $lastPublicationAttempt: timestamptz!
  ) {
    update_Locations(
      where: { id: { _eq: $id } }
      _set: {
        isPublished: $isPublished
        lastPublicationAttempt: $lastPublicationAttempt
      }
    ) {
      affected_rows
    }
  }
`;

export const UPDATE_EVSE_PUBLICATION_STATUS_MUTATION = gql`
  mutation UpdateEvsePublicationStatus(
    $id: Int!
    $isPublished: Boolean!
    $lastPublicationAttempt: timestamptz!
  ) {
    update_Evses(
      where: { id: { _eq: $id } }
      _set: {
        isPublished: $isPublished
        lastPublicationAttempt: $lastPublicationAttempt
      }
    ) {
      affected_rows
    }
  }
`;

export const UPDATE_CONNECTOR_PUBLICATION_STATUS_MUTATION = gql`
  mutation UpdateConnectorPublicationStatus(
    $id: Int!
    $isPublished: Boolean!
    $lastPublicationAttempt: timestamptz!
  ) {
    update_Connectors(
      where: { id: { _eq: $id } }
      _set: {
        isPublished: $isPublished
        lastPublicationAttempt: $lastPublicationAttempt
      }
    ) {
      affected_rows
    }
  }
`;
