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
      coordinates
      createdAt
      updatedAt
      Tenant {
        partyId
        countryCode
      }
      ChargingStations {
        id
        isOnline
        protocol
        createdAt
        updatedAt
        Evses: VariableAttributes(
          distinct_on: evseDatabaseId
          where: {
            evseDatabaseId: { _is_null: false }
            Evse: { connectorId: { _is_null: false } }
          }
        ) {
          Evse {
            databaseId
            id
            connectorId
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
      coordinates
      createdAt
      updatedAt
      ChargingStations {
        id
        isOnline
        protocol
        createdAt
        updatedAt
        Evses: VariableAttributes(
          distinct_on: evseDatabaseId
          where: {
            evseDatabaseId: { _is_null: false }
            Evse: { connectorId: { _is_null: false } }
          }
        ) {
          Evse {
            databaseId
            id
            connectorId
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
      id
      ChargingStations(where: { id: { _eq: $stationId } }) {
        id
        Evses: VariableAttributes(where: { evseDatabaseId: { _eq: $evseId } }) {
          Evse {
            databaseId
            id
            connectorId
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
      id
      ChargingStations(where: { id: { _eq: $stationId } }) {
        id
        Evses: VariableAttributes(where: { evseDatabaseId: { _eq: $evseId } }) {
          Evse {
            databaseId
            id
            connectorId
            createdAt
            updatedAt
            Connectors: VariableAttributes(
              where: { id: { _eq: $connectorId } }
            ) {
              id
              createdAt
              updatedAt
            }
          }
        }
      }
    }
  }
`;
