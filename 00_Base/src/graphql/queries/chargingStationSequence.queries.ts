import { gql } from 'graphql-request';

export const GET_SEQUENCE = gql`
  query GetSequence($stationId: String!, $type: String!) {
    ChargingStationSequences(
      where: { stationId: { _eq: $stationId }, type: { _eq: $type } }
    ) {
      value
    }
  }
`;

export const UPSERT_SEQUENCE = gql`
  mutation UpsertSequence($stationId: String!, $type: String!, $value: bigint!) {
    insert_ChargingStationSequences_one(
      object: { stationId: $stationId, type: $type, value: $value }
      on_conflict: {
        constraint: ChargingStationSequences_stationId_type_key
        update_columns: value
      }
    ) {
      value
    }
  }
`;
