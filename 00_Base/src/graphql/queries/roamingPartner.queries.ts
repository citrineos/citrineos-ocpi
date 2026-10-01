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

export const SET_ROAMING_PARTNER_ROLES = gql`
  mutation SetRoamingPartnerRoles($id: Int!, $roles: jsonb!) {
    update_RoamingPartners_by_pk(
      pk_columns: { id: $id }
      _set: { roles: $roles }
    ) {
      id
      roles
    }
  }
`;
