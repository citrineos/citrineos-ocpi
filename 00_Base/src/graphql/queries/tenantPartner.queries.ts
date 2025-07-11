import { gql } from 'graphql-request';

export const GET_TENANT_PARTNERS_BY_CPO_AND_MODULE_ID = gql`
  query GetTenantPartnersByCpoAndModuleId(
    $cpoCountryCode: String!
    $cpoPartyId: String!
    $moduleId: String!
  ) {
    TenantPartners(
      where: {
        Tenant: {
          countryCode: { _eq: $cpoCountryCode }
          partyId: { _eq: $cpoPartyId }
        }
        partnerProfile: {
          _contains: { endpoints: [{ identifier: $moduleId }] }
        }
      }
    ) {
      id
      countryCode
      partyId
      partnerProfile
      Tenant {
        serverCredential
        serverVersions
      }
    }
  }
`;

export const GET_TENANT_PARTNERS_BY_CPO_AND_MODULE_ID_AND_CLIENT_CRED = gql`
  query GetTenantPartnersByCpoClientAndModuleId(
    $cpoCountryCode: String!
    $cpoPartyId: String!
    $moduleId: String!
    $clientCountryCode: String
    $clientPartyId: String
  ) {
    TenantPartners(
      where: {
        Tenant: {
          countryCode: { _eq: $cpoCountryCode }
          partyId: { _eq: $cpoPartyId }
        }
        countryCode: { _eq: $clientCountryCode }
        partyId: { _eq: $clientPartyId }
        partnerProfile: {
          _contains: { endpoints: [{ identifier: $moduleId }] }
        }
      }
    ) {
      id
      countryCode
      partyId
      partnerProfile
      Tenant {
        serverCredential
        serverVersions
      }
    }
  }
`;
