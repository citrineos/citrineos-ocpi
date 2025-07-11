
import { gql } from 'graphql-request';

export const GET_CLIENT_INFORMATION_BY_SERVER_TOKEN = gql`
  query GetClientInformationByServerToken($serverToken: String!) {
    TenantPartners(
      where: {
        Tenant: { serverCredential: { _contains: { token: $serverToken } } }
      }
    ) {
      id
      partnerProfile
      Tenant {
        id
        serverCredential
        serverVersions
      }
    }
  }
`;

export const GET_CLIENT_INFORMATION_BY_CLIENT_COUNTRY_AND_PARTY_ID = gql`
  query GetClientInformationByClient($countryCode: String!, $partyId: String!) {
    TenantPartners(
      where: {
        countryCode: { _eq: $countryCode }
        partyId: { _eq: $partyId }
      }
    ) {
      id
      partnerProfile
      Tenant {
        id
        serverCredential
        serverVersions
      }
    }
  }
`;

export const DELETE_TENANT_PARTNER_BY_ID = gql`
  mutation DeleteTenantPartner($id: Int!) {
    delete_TenantPartners(where: { id: { _eq: $id } }) {
      affected_rows
    }
  }
`;
