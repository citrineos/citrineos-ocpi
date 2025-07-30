import { gql } from 'graphql-request';

export const OCPI_LOCATION_EDIT_MUTATION = gql`
  mutation OcpiLocationEdit($id: Int!, $object: OcpiLocations_set_input!) {
    update_OcpiLocations_by_pk(pk_columns: { id: $id }, _set: $object) {
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
    }
  }
`;
