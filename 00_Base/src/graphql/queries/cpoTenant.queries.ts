import { gql } from 'graphql-request';

export const GET_CPO_TENANT_BY_CLIENT_COUNTRY_AND_PARTY_ID = gql`
  query GetCpoTenantByClient($countryCode: String!, $partyId: String!) {
    Tenants(
      where: {
        TenantPartners: {
          countryCode: { _eq: $countryCode }
          partyId: { _eq: $partyId }
        }
      }
    ) {
      id
      countryCode
      partyId
      TenantPartners {
        id
        countryCode
        partyId
        partnerProfile
      }
      serverVersions
      serverCredentialsRoles
    }
  }
`;

export const GET_CPO_TENANT_BY_SERVER_COUNTRY_AND_PARTY_ID = gql`
  query GetCpoTenantByServer($countryCode: String!, $partyId: String!) {
    Tenants(
      where: { countryCode: { _eq: $countryCode }, partyId: { _eq: $partyId } }
    ) {
      id
      countryCode
      partyId
      TenantPartners {
        id
        countryCode
        partyId
      }
      serverVersions
      serverCredentialsRoles
    }
  }
`;

export const DELETE_CPO_TENANT_BY_ID = gql`
  mutation DeleteCpoTenantById($id: Int!) {
    delete_Tenants(where: { id: { _eq: $id } }) {
      affected_rows
    }
  }
`;
