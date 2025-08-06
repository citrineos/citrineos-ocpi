import { gql } from 'graphql-request';

export const GET_TENANT_PARTNER_BY_SERVER_TOKEN = gql`
  query GetTenantPartnerByServerToken($serverToken: String!) {
    TenantPartners(
      where: {
        partnerProfileOCPI: {
          _contains: { serverCredentials: { token: $serverToken } }
        }
      }
    ) {
      id
      countryCode
      partyId
      partnerProfileOCPI
      Tenant {
        id
        countryCode
        partyId
        serverProfileOCPI
      }
    }
  }
`;

export const DELETE_TENANT_PARTNER_BY_SERVER_TOKEN = gql`
  mutation DeleteTenantPartnerByServerToken($serverToken: String!) {
    delete_TenantPartners(
      where: {
        partnerProfileOCPI: {
          _contains: { serverCredentials: { token: $serverToken } }
        }
      }
    ) {
      affected_rows
    }
  }
`;

export const GET_TENANT_PARTNER_BY_CPO_AND_AND_CLIENT = gql`
  query GetTenantPartnerByCpoClientAndModuleId(
    $cpoCountryCode: String!
    $cpoPartyId: String!
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
      }
    ) {
      id
      countryCode
      partyId
      partnerProfileOCPI
      Tenant {
        id
        countryCode
        partyId
        serverProfileOCPI
      }
    }
  }
`;

export const LIST_TENANT_PARTNERS_BY_CPO = gql`
  query TenantPartnersList(
    $cpoCountryCode: String!
    $cpoPartyId: String!
    $endpointIdentifier: String!
  ) {
    TenantPartners(
      where: {
        Tenant: {
          countryCode: { _eq: $cpoCountryCode }
          partyId: { _eq: $cpoPartyId }
        }
        partnerProfileOCPI: {
          _contains: { endpoints: { identifier: $endpointIdentifier } }
        }
      }
    ) {
      id
      countryCode
      partyId
      partnerProfileOCPI
      Tenant {
        id
        countryCode
        partyId
        serverProfileOCPI
      }
    }
    TenantPartners_aggregate(
      where: {
        Tenant: {
          countryCode: { _eq: $cpoCountryCode }
          partyId: { _eq: $cpoPartyId }
        }
        partnerProfileOCPI: {
          _contains: { endpoints: { identifier: $endpointIdentifier } }
        }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// export const UPDATE_TENANT_PARTNER_MUTATION = gql`
//   mutation UpdateTenantPartner(
//     $id: Int!
//     $set: TenantPartners_set_input!
//   ) {
//     update_TenantPartners_by_pk(pk_columns: {id: 10}, _set: $set) {
//       returning {
//         id
//       }
//     }
//   }
// `;
