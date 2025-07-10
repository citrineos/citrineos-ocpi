
import { gql } from 'graphql-request';

export const GET_TENANT_VERSION_ENDPOINTS = gql`
  query GetTenantVersionEndpoints($version: String!) {
    Tenants(
      where: {
        serverVersions: { _contains: [{ version: $version }] }
      }
    ) {
      serverVersions
    }
  }
`;
