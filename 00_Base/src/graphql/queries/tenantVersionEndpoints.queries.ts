import { gql } from 'graphql-request';

export const GET_TENANT_BY_ID = gql`
  query GetTenantById($id: Int!) {
    Tenants(where: { id: { _eq: $id } }) {
      serverProfileOCPI
      countryCode
      partyId
    }
  }
`;
