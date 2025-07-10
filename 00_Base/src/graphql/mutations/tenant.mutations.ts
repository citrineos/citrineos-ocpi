import { gql } from 'graphql-request';

export const CREATE_TENANT = gql`
  mutation CreateTenant($input: TenantInput!) {
    createTenant(input: $input) {
      id
      country_code
      party_id
      businessDetails {
        name
        website
        images {
          url
          category
          type
          width
          height
        }
      }
      partners {
        id
        country_code
        party_id
        role
      }
    }
  }
`;

export const UPDATE_TENANT = gql`
  mutation UpdateTenant($id: ID!, $input: TenantInput!) {
    updateTenant(id: $id, input: $input) {
      id
      country_code
      party_id
      businessDetails {
        name
        website
        images {
          url
          category
          type
          width
          height
        }
      }
      partners {
        id
        country_code
        party_id
        role
      }
    }
  }
`;

export const CREATE_TENANT_PARTNER = gql`
  mutation CreateTenantPartner($input: TenantPartnerInput!) {
    createTenantPartner(input: $input) {
      id
      country_code
      party_id
      role
      businessDetails {
        name
        website
        images {
          url
          category
          type
          width
          height
        }
      }
      tenant {
        id
        country_code
        party_id
      }
    }
  }
`;

export const UPDATE_TENANT_PARTNER = gql`
  mutation UpdateTenantPartner($id: ID!, $input: TenantPartnerInput!) {
    updateTenantPartner(id: $id, input: $input) {
      id
      country_code
      party_id
      role
      businessDetails {
        name
        website
        images {
          url
          category
          type
          width
          height
        }
      }
      tenant {
        id
        country_code
        party_id
      }
    }
  }
`;
