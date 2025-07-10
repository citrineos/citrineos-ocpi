import { gql } from 'graphql-request';

export const GET_TENANT_VERSION_ENDPOINTS = gql`
  query GetTenantVersionEndpoints($version: String!) {
    Tenants(where: { versions: { version: $version } }) {
      serverVersions
    }
  }
`;
