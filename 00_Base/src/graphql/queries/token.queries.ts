import { gql } from 'graphql-request';

export const READ_AUTHORIZATION = gql`
  query ReadAuthorizations(
    $idToken: String
    $type: String
    $countryCode: String
    $partyId: String
  ) {
    Authorizations(
      where: {
        idToken: { _eq: $idToken }
        idTokenType: { _eq: $type }
        TenantPartner: {
          countryCode: { _eq: $countryCode }
          partyId: { _eq: $partyId }
        }
      }
    ) {
      id
      createdAt
      updatedAt
      tenantId
      TenantPartner {
        id
        countryCode
        partyId
      }
      GroupAuthorization {
        idToken
      }
      idToken
      idTokenType
      additionalInfo
      status
      realTimeAuth
      language1
    }
  }
`;

export const UPDATE_TOKEN_MUTATION = gql`
  mutation UpdateAuthorization(
    $idToken: String
    $type: String
    $countryCode: String
    $partyId: String
    $additionalInfo: jsonb,
    $status: String,
    $language1: String,
  ) {
    update_Authorizations(where: {
        idToken: { _eq: $idToken }
        idTokenType: { _eq: $type }
        TenantPartner: {
          countryCode: { _eq: $countryCode }
          partyId: { _eq: $partyId }
        }
      }, _set: {
        additionalInfo: $additionalInfo
        status: $status
        $language1: $language1
      }) {
      returning {
        id
        createdAt
        updatedAt
        tenantId
        TenantPartner {
          id
          countryCode
          partyId
        }
        GroupAuthorization {
          idToken
        }
        idToken
        idTokenType
        additionalInfo
        status
        realTimeAuth
        language1
      }
    }
  }
`;

// export const GET_AUTHORIZATION_BY_ID_QUERY = gql`
//   query GetAuthorizationById($idToken: String!, $idTokenType: String!) {
//     Authorizations(
//       where: { idToken: { _eq: $idToken }, idTokenType: { _eq: $idTokenType } }
//     ) {
//       id
//       idToken
//       idTokenType
//     }
//   }
// `;
