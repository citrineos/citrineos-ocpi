// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-request';

export const FIND_SESSION_P2P_QUERY = gql`
  query FindSessionP2p($ocpiSessionId: String!, $tenantPartnerId: Int!) {
    Sessions(
      where: {
        ocpiSessionId: { _eq: $ocpiSessionId }
        tenantPartnerId: { _eq: $tenantPartnerId }
        roamingPartnerId: { _is_null: true }
      }
      limit: 1
    ) {
      id
    }
  }
`;

export const FIND_SESSION_ROAMING_QUERY = gql`
  query FindSessionRoaming(
    $ocpiSessionId: String!
    $tenantPartnerId: Int!
    $roamingPartnerId: Int!
  ) {
    Sessions(
      where: {
        ocpiSessionId: { _eq: $ocpiSessionId }
        tenantPartnerId: { _eq: $tenantPartnerId }
        roamingPartnerId: { _eq: $roamingPartnerId }
      }
      limit: 1
    ) {
      id
    }
  }
`;

export const GET_SESSION_BY_OCPI_ID = gql`
  query GetSessionByOcpiId($ocpiSessionId: String!, $tenantPartnerId: Int!) {
    Sessions(
      where: {
        ocpiSessionId: { _eq: $ocpiSessionId }
        tenantPartnerId: { _eq: $tenantPartnerId }
        roamingPartnerId: { _is_null: true }
      }
    ) {
      id
      ocpiSessionId
      countryCode
      partyId
      startDateTime
      endDateTime
      kwh
      cdrToken
      authMethod
      authorizationReference
      locationId
      evseUid
      connectorId
      meterId
      currency
      chargingPeriods
      totalCost
      status
      lastUpdated
      tenantId
      tenantPartnerId
      roamingPartnerId
      createdAt
      updatedAt
    }
  }
`;

export const GET_SESSION_BY_OCPI_ID_ROAMING_QUERY = gql`
  query GetSessionByOcpiIdRoaming(
    $ocpiSessionId: String!
    $tenantPartnerId: Int!
    $roamingPartnerId: Int!
  ) {
    Sessions(
      where: {
        ocpiSessionId: { _eq: $ocpiSessionId }
        tenantPartnerId: { _eq: $tenantPartnerId }
        roamingPartnerId: { _eq: $roamingPartnerId }
      }
    ) {
      id
      ocpiSessionId
      countryCode
      partyId
      startDateTime
      endDateTime
      kwh
      cdrToken
      authMethod
      authorizationReference
      locationId
      evseUid
      connectorId
      meterId
      currency
      chargingPeriods
      totalCost
      status
      lastUpdated
      tenantId
      tenantPartnerId
      roamingPartnerId
      createdAt
      updatedAt
    }
  }
`;

export const GET_SESSIONS_PAGINATED = gql`
  query GetSessionsPaginated(
    $limit: Int
    $offset: Int
    $where: Sessions_bool_exp!
  ) {
    Sessions(
      limit: $limit
      offset: $offset
      order_by: { lastUpdated: asc }
      where: $where
    ) {
      id
      ocpiSessionId
      countryCode
      partyId
      startDateTime
      endDateTime
      kwh
      cdrToken
      authMethod
      authorizationReference
      locationId
      evseUid
      connectorId
      meterId
      currency
      chargingPeriods
      totalCost
      status
      lastUpdated
      tenantId
      tenantPartnerId
      roamingPartnerId
      createdAt
      updatedAt
    }
  }
`;

export const INSERT_SESSION_MUTATION = gql`
  mutation InsertSession($object: Sessions_insert_input!) {
    insert_Sessions_one(object: $object) {
      id
      ocpiSessionId
      countryCode
      partyId
      startDateTime
      endDateTime
      kwh
      cdrToken
      authMethod
      authorizationReference
      locationId
      evseUid
      connectorId
      meterId
      currency
      chargingPeriods
      totalCost
      status
      lastUpdated
      tenantId
      tenantPartnerId
      roamingPartnerId
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_SESSION_BY_PK_MUTATION = gql`
  mutation UpdateSessionByPk($id: Int!, $set: Sessions_set_input!) {
    update_Sessions_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
      ocpiSessionId
      countryCode
      partyId
      startDateTime
      endDateTime
      kwh
      cdrToken
      authMethod
      authorizationReference
      locationId
      evseUid
      connectorId
      meterId
      currency
      chargingPeriods
      totalCost
      status
      lastUpdated
      tenantId
      tenantPartnerId
      roamingPartnerId
      createdAt
      updatedAt
    }
  }
`;

// Keep for backward compat if used elsewhere
export const UPDATE_SESSION_MUTATION = gql`
  mutation UpdateSession(
    $ocpiSessionId: String!
    $tenantPartnerId: Int!
    $set: Sessions_set_input!
  ) {
    update_Sessions(
      where: {
        ocpiSessionId: { _eq: $ocpiSessionId }
        tenantPartnerId: { _eq: $tenantPartnerId }
        roamingPartnerId: { _is_null: true }
      }
      _set: $set
    ) {
      returning {
        id
        ocpiSessionId
        countryCode
        partyId
        startDateTime
        endDateTime
        kwh
        cdrToken
        authMethod
        authorizationReference
        locationId
        evseUid
        connectorId
        meterId
        currency
        chargingPeriods
        totalCost
        status
        lastUpdated
        tenantId
        tenantPartnerId
        roamingPartnerId
        createdAt
        updatedAt
      }
    }
  }
`;
