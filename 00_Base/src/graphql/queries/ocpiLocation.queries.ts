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

export const OCPI_LOCATION_EDIT_BY_CORE_ID_MUTATION = gql`
  mutation OcpiLocationEditByCoreId(
    $coreLocationId: Int!
    $object: OcpiLocations_set_input!
  ) {
    update_OcpiLocations(
      where: { coreLocationId: { _eq: $coreLocationId } }
      _set: $object
    ) {
      returning {
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
  }
`;

export const GET_OCPI_LOCATION_BY_CORE_ID_QUERY = gql`
  query OcpiLocationByCoreId($coreLocationId: Int!) {
    OcpiLocations(where: { coreLocationId: { _eq: $coreLocationId } }) {
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
      coreLocationId
    }
  }
`;
