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
        Tenant: {
          countryCode: { _eq: $countryCode }
          partyId: { _eq: $partyId }
        }
      }
    ) {
      id
      createdAt
      updatedAt
      tenantId
      Tenant {
        id
        countryCode
        partyId
      }
      idToken
      idTokenType
    }
  }
`;

export const UPDATE_TOKEN_MUTATION = gql`
  mutation UpdateAuthorization(
    $where: Authorizations_bool_exp!
    $set: Authorizations_set_input!
  ) {
    update_Authorizations(where: $where, _set: $set) {
      returning {
        id
        idToken
        idTokenType
        Tenant {
          countryCode
          partyId
        }
      }
    }
  }
`;

export const GET_AUTHORIZATION_BY_ID_QUERY = gql`
  query GetAuthorizationById($idToken: String!, $idTokenType: String!) {
    Authorizations(
      where: { idToken: { _eq: $idToken }, idTokenType: { _eq: $idTokenType } }
    ) {
      id
      idToken
      idTokenType
    }
  }
`;
