import { gql } from 'graphql-request';

export const GET_TENANT_PARTNER_BY_COUNTRY_AND_PARTY_ID = gql`
  query GetTenantPartner($countryCode: String!, $partyId: String!) {
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
      }
    }
  }
`;
