import { gql } from 'graphql-request';

export const GET_TENANT_AND_PARTNERS = gql`
  query GetTenantAndPartners($countryCode: String!, $partyId: String!) {
    Tenants(
      where: { countryCode: { _eq: $countryCode }, partyId: { _eq: $partyId } }
    ) {
      id
      countryCode
      partyId
      serverProfileOCPI
      tenantPartners: TenantPartners {
        id
        countryCode
        partyId
        partnerProfileOCPI
      }
    }
  }
`;
