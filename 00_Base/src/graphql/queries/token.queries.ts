import { gql } from 'graphql-request';
export const READ_AUTHORIZATION = gql`
  query ReadAuthorizations($idToken: String, $type: String, $countryCode: String, $partyId: String) {
    Authorizations(
      where: {
        IdToken: { idToken: { _eq: $idToken }, type: { _eq: $type } },
        Tenant: { countryCode: { _eq: $countryCode }, partyId: { _eq: $partyId } },
        IdTokenInfo: { IdToken: { IdTokenAdditionalInfos: {} } }
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
      IdToken {
        id
        idToken
        type
      }
      IdTokenInfo {
        id
        IdToken {
          id
          idToken
          IdTokenAdditionalInfos {
            AdditionalInfo {
              id
            },
            IdToken {
              id
            },
            Tenant {
              id
            },
            additionalInfoId,
            createdAt,
            idTokenId,
            tenantId,
            updatedAt
          }
        }
      }
    }
  }
`


export const UPDATE_TOKEN_MUTATION = gql`
  mutation UpdateAuthorization($where: Authorizations_bool_exp!, $set: Authorizations_set_input!) {
    update_Authorizations(where: $where, _set: $set) {
      returning {
        id
        IdToken {
          idToken
          type
        }
        IdTokenInfo {
          status
          language1
          groupIdTokenId
        }
        Tenant {
          countryCode
          partyId
        }
      }
    }
  }
`;
