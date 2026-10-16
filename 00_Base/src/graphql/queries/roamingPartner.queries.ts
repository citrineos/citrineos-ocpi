// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-request';

export const CREATE_ROAMING_PARTNER = gql`
  mutation CreateRoamingPartner(
    $countryCode: String!
    $partyId: String!
    $tenantPartnerId: Int!
    $name: String!
    $signatureDate: date!
    $contractStartDate: date!
    $roles: jsonb!
  ) {
    insert_RoamingPartners_one(
      object: {
        countryCode: $countryCode
        partyId: $partyId
        tenantPartnerId: $tenantPartnerId
        name: $name
        signatureDate: $signatureDate
        contractStartDate: $contractStartDate
        roles: $roles
      }
    ) {
      id
    }
  }
`;

export const GET_ROAMING_PARTNER_BY_IDENTITY = gql`
  query GetRoamingPartnerByIdentity(
    $tenantPartnerId: Int!
    $countryCode: String!
    $partyId: String!
  ) {
    RoamingPartners(
      where: {
        tenantPartnerId: { _eq: $tenantPartnerId }
        countryCode: { _eq: $countryCode }
        partyId: { _eq: $partyId }
      }
      limit: 1
    ) {
      id
      name
      signatureDate
      contractStartDate
      roles
    }
  }
`;

// Single atomic UPDATE: appends the role only if it is not already present,
// so concurrent calls cannot clobber each other (roles is NOT NULL DEFAULT []).
export const ADD_ROAMING_PARTNER_ROLE = gql`
  mutation AddRoamingPartnerRole($id: Int!, $role: jsonb!) {
    append: update_RoamingPartners(
      where: { id: { _eq: $id }, _not: { roles: { _contains: $role } } }
      _append: { roles: $role }
    ) {
      affected_rows
    }
  }
`;
