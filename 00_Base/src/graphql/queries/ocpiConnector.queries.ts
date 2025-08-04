import { gql } from 'graphql-request';

export const OCPI_CONNECTOR_UPSERT_MUTATION = gql`
  mutation OcpiConnectorEdit($object: OcpiConnectors_insert_input!) {
    insert_OcpiConnectors_one(
      object: $object
      on_conflict: {
        constraint: ocpi_evse_evse_id_station_id_key
        update_columns: [last_updated]
      }
    ) {
      createdAt
      evseId
      id
      lastUpdated
      physicalReference
      removed
      stationId
      updatedAt
    }
  }
`;
