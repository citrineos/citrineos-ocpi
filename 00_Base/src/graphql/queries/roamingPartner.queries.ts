// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-request';

export const CREATE_ROAMING_PARTNER = gql`
  mutation CreateRoamingPartner(
    $countryCode: String!
    $partyId: String!
    $tenantPartnerId: Int!
  ) {
    insert_RoamingPartners_one(
      object: {
        countryCode: $countryCode
        partyId: $partyId
        tenantPartnerId: $tenantPartnerId
      }
    ) {
      id
    }
  }
`;
