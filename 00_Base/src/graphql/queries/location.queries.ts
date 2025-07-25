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
      postalCode
      state
      country
      publishUpstream
      timeZone
      coordinates
      createdAt
      updatedAt
      Tenant {
        partyId
        countryCode
      }
      chargingPool: ChargingStations {
        id
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
        evses {
          id
          stationId
          evseTypeId
          evseId
          physicalReference
          removed
          createdAt
          updatedAt
          connectors {
            id
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
      postalCode
      state
      country
      publishUpstream
      timeZone
      coordinates
      createdAt
      updatedAt
      Tenant {
        partyId
        countryCode
      }
      chargingPool: ChargingStations {
        id
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
        evses {
          id
          stationId
          evseTypeId
          evseId
          physicalReference
          removed
          createdAt
          updatedAt
          connectors {
            id
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
        }
      }
    }
  }
`;

export const GET_EVSE_BY_ID_QUERY = gql`
  query GetEvseById($locationId: Int!, $stationId: String!, $evseId: Int!) {
    Locations(where: { id: { _eq: $locationId } }) {
      chargingPool: ChargingStations(where: { id: { _eq: $stationId } }) {
        evses(where: { evseId: { _eq: $evseId } }) {
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
        evses(where: { evseId: { _eq: $evseId } }) {
          connectors(where: { connectorId: { _eq: $connectorId } }) {
            id
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
        }
      }
    }
  }
`;

export const GET_LOCATION_BY_STATION_ID_QUERY = gql`
  query GetLocationByStationId($stationId: String!) {
    Locations(
      where: { ChargingStations: { id: { _eq: $stationId } } }
    ) {
      id
      name
      address
      city
      postalCode
      state
      country
      publishUpstream
      timeZone
      coordinates
      createdAt
      updatedAt
      Tenant {
        partyId
        countryCode
      }
      chargingPool: ChargingStations {
        id
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
        evses {
          id
          stationId
          evseTypeId
          evseId
          physicalReference
          removed
          createdAt
          updatedAt
          connectors {
            id
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
        }
      }
    }
  }
`;

export const GET_LOCATION_BY_EVSE_ID_QUERY = gql`
  query GetLocationByEvseId($evseId: Int!) {
    Locations(
      where: { ChargingStations: { evses: { id: { _eq: $evseId } } } }
    ) {
      id
      name
      address
      city
      postalCode
      state
      country
      publishUpstream
      timeZone
      coordinates
      createdAt
      updatedAt
      Tenant {
        partyId
        countryCode
      }
      chargingPool: ChargingStations {
        id
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
        evses {
          id
          stationId
          evseTypeId
          evseId
          physicalReference
          removed
          createdAt
          updatedAt
          connectors {
            id
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
        }
      }
    }
  }
`;

export const GET_LOCATION_BY_CONNECTOR_ID_QUERY = gql`
  query GetLocationByConnectorId($connectorId: Int!) {
    Locations(
      where: {
        ChargingStations: { evses: { connectors: { id: { _eq: $connectorId } } } }
      }
    ) {
      id
      name
      address
      city
      postalCode
      state
      country
      publishUpstream
      timeZone
      coordinates
      createdAt
      updatedAt
      Tenant {
        partyId
        countryCode
      }
      chargingPool: ChargingStations {
        id
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
        evses {
          id
          stationId
          evseTypeId
          evseId
          physicalReference
          removed
          createdAt
          updatedAt
          connectors {
            id
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
        }
      }
    }
  }
`;
