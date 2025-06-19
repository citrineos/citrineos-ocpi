import { gql } from 'graphql-request';

export const GET_LOCATIONS_QUERY = gql`
  query GetLocations($limit: Int, $offset: Int, $countryCode: String, $partyId: String, $dateFrom: String, $dateTo: String) {
    Locations(
      offset: $offset
      limit: $limit
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
