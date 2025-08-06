import { gql } from 'graphql-request';

export const GET_CHARGING_STATIONS_QUERY = gql`
  query GetChargingStations(
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

export const GET_CHARGING_STATION_BY_ID_QUERY = gql`
  query GetChargingStationById($id: String!) {
    ChargingStations(where: { id: { _eq: $id } }) {
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
      Tenant {
        partyId
        countryCode
      }
    }
  }
`;
