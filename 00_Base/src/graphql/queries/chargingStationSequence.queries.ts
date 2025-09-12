// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-request';

export const GET_SEQUENCE = gql`
  query GetSequence($tenantId: Int!, $stationId: String!, $type: String!) {
    ChargingStationSequences(
      where: {
        tenantId: { _eq: $tenantId }
        stationId: { _eq: $stationId }
        type: { _eq: $type }
      }
    ) {
      value
    }
  }
`;

export const UPSERT_SEQUENCE = gql`
  mutation UpsertSequence(
    $tenantId: Int!
    $stationId: String!
    $type: String!
    $value: bigint!
    $createdAt: timestamptz!
  ) {
    insert_ChargingStationSequences_one(
      object: {
        tenantId: $tenantId
        stationId: $stationId
        type: $type
        value: $value
        createdAt: $createdAt
        updatedAt: $createdAt
      }
      on_conflict: {
        constraint: ChargingStationSequences_stationId_type_key
        update_columns: value
      }
    ) {
      value
    }
  }
`;
