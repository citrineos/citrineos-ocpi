// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

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
      awsSecretCertificateArn
      tenantId
      tenant: Tenant {
        id
        countryCode
        partyId
        serverProfileOCPI
      }
      roamingPartners: RoamingPartners {
        id
        countryCode
        partyId
      }
    }
  }
`;

/** Resolve a TenantPartner row by OCPI country_code + party_id (e.g. Receiver URL segment). */
export const GET_TENANT_PARTNER_ID_BY_COUNTRY_PARTY = gql`
  query GetTenantPartnerIdByCountryParty(
    $countryCode: String!
    $partyId: String!
  ) {
    TenantPartners(
      where: { countryCode: { _eq: $countryCode }, partyId: { _eq: $partyId } }
      limit: 1
    ) {
      id
    }
  }
`;

export const GET_TENANT_PARTNER_BY_ID = gql`
  query GetTenantPartnerById($id: Int!) {
    TenantPartners_by_pk(id: $id) {
      id
      countryCode
      partyId
      partnerProfileOCPI
      awsSecretCertificateArn
      tenantId
      tenant: Tenant {
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

export const GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY
 = gql`
  query GetTenantPartnerByCpoClientAndModuleId(
    $ourCountryCode: String!
    $ourPartyId: String!
    $partnerCountryCode: String
    $partnerPartyId: String
  ) {
    TenantPartners(
      where: {
        Tenant: {
          countryCode: { _eq: $ourCountryCode }
          partyId: { _eq: $ourPartyId }
        }
        countryCode: { _eq: $partnerCountryCode }
        partyId: { _eq: $partnerPartyId }
      }
    ) {
      id
      countryCode
      partyId
      partnerProfileOCPI
      awsSecretCertificateArn
      tenantId
      tenant: Tenant {
        id
        countryCode
        partyId
        serverProfileOCPI
      }
      roamingPartners: RoamingPartners {
        id
        countryCode
        partyId
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
          _contains: { endpoints: [{ identifier: $endpointIdentifier }] }
        }
      }
    ) {
      id
      countryCode
      partyId
      partnerProfileOCPI
      awsSecretCertificateArn
      tenantId
      tenant: Tenant {
        id
        countryCode
        partyId
        serverProfileOCPI
      }
    }
  }
`;
