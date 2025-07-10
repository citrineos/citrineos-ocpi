import { gql } from 'graphql-request';

export const GET_CLIENT_INFORMATION_BY_SERVER_COUNTRY_AND_PARTY_ID = gql`
  query GetClientInformationByServer($countryCode: String!, $partyId: String!) {
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
        partnerProfile
      }
      serverVersions
      serverCredential
    }
  }
`;

export const GET_CLIENT_INFORMATION_BY_CLIENT_COUNTRY_AND_PARTY_ID = gql`
  query GetClientInformationByClient($countryCode: String!, $partyId: String!) {
    TenantPartners(
      where: { countryCode: { _eq: $countryCode }, partyId: { _eq: $partyId } }
    ) {
      id
      countryCode
      partyId
      partnerProfile
      Tenant {
        id
        countryCode
        partyId
        serverVersions
        serverCredentialsRoles
        serverCredential
      }
    }
  }
`;

export const DELETE_CLIENT_INFORMATION_BY_TOKEN = gql`
  mutation DeleteClientInformationByToken($token: String!) {
    deleteClientInformation(where: { serverToken: $token }) {
      affected_rows
    }
  }
`;

export const GET_CLIENT_INFORMATION_BY_SERVER_TOKEN = gql`
  query GetClientInformationByServerToken($serverToken: String!) {
    TenantPartners(where: { serverToken: $serverToken }) {
      id
      countryCode
      partyId
      Tenant {
        serverVersions
        serverCredentialsRoles
      }
      partnerProfile
    }
  }
`;
