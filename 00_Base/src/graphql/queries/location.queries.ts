import { gql } from 'graphql-request';

export const GET_LOCATIONS_QUERY = gql`
  query GetLocations(
    $limit: Int
    $offset: Int
    $countryCode: String
    $partyId: String
    $dateFrom: timestamptz
    $dateTo: timestamptz
  ) {
    Locations(
      offset: $offset
      limit: $limit
      order_by: { createdAt: asc }
      where: {
        Tenant: {
          countryCode: { _eq: $countryCode }
          partyId: { _eq: $partyId }
        }
        _and: [
          { updatedAt: { _gte: $dateFrom } }
          { updatedAt: { _lte: $dateTo } }
        ]
      }
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
      Tenant {
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
        Evses {
          id
          stationId
          evseTypeId
          evseId
          physicalReference
          removed
          createdAt
          updatedAt
          Connectors {
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
      Tenant {
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
        Evses {
          id
          stationId
          evseTypeId
          evseId
          physicalReference
          removed
          createdAt
          updatedAt
          Connectors {
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

export const GET_EVSE_BY_ID_QUERY = gql`
  query GetEvseById($locationId: Int!, $stationId: String!, $evseId: Int!) {
    Locations(where: { id: { _eq: $locationId } }) {
      chargingPool: ChargingStations(where: { id: { _eq: $stationId } }) {
        Evses(where: { id: { _eq: $evseId } }) {
          id
          stationId
          evseTypeId
          evseId
          physicalReference
          removed
          createdAt
          updatedAt
          ChargingStation {
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
          }
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
        Evses(where: { id: { _eq: $evseId } }) {
          Connectors(where: { connectorId: { _eq: $connectorId } }) {
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
