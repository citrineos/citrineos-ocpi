// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-request';

export const FIND_GIREVE_RETRY_QUEUE = gql`
  query FindGireveRetryQueue(
    $moduleId: String!
    $partnerTenantPartnerId: Int!
    $resourceType: String!
    $resourceId: String!
  ) {
    GireveBroadcastRetryQueues(
      where: {
        moduleId: { _eq: $moduleId }
        partnerTenantPartnerId: { _eq: $partnerTenantPartnerId }
        resourceType: { _eq: $resourceType }
        resourceId: { _eq: $resourceId }
      }
      limit: 1
    ) {
      id
    }
  }
`;

export const INSERT_GIREVE_RETRY_QUEUE = gql`
  mutation InsertGireveRetryQueue(
    $id: uuid!
    $partnerTenantPartnerId: Int!
    $cpoCountryCode: String!
    $cpoPartyId: String!
    $moduleId: String!
    $interfaceRole: String!
    $httpMethod: String!
    $resourceType: String!
    $resourceId: String!
    $ocpiPath: String
    $payload: jsonb!
    $now: timestamptz!
    $nextRetryAt: timestamptz!
    $lastError: String!
  ) {
    insert_GireveBroadcastRetryQueues_one(
      object: {
        id: $id
        partnerTenantPartnerId: $partnerTenantPartnerId
        cpoCountryCode: $cpoCountryCode
        cpoPartyId: $cpoPartyId
        moduleId: $moduleId
        interfaceRole: $interfaceRole
        httpMethod: $httpMethod
        resourceType: $resourceType
        resourceId: $resourceId
        ocpiPath: $ocpiPath
        payload: $payload
        status: "pending"
        attemptCount: 0
        nextRetryAt: $nextRetryAt
        lastError: $lastError
        createdAt: $now
        updatedAt: $now
      }
    ) {
      id
    }
  }
`;

export const UPDATE_GIREVE_RETRY_QUEUE = gql`
  mutation UpdateGireveRetryQueue(
    $id: uuid!
    $updatedAt: timestamptz!
    $nextRetryAt: timestamptz!
    $payload: jsonb!
    $ocpiPath: String
    $lastError: String!
  ) {
    update_GireveBroadcastRetryQueues_by_pk(
      pk_columns: { id: $id }
      _set: {
        payload: $payload
        ocpiPath: $ocpiPath
        nextRetryAt: $nextRetryAt
        lastError: $lastError
        status: "pending"
        updatedAt: $updatedAt
      }
    ) {
      id
    }
  }
`;

export const FETCH_DUE_GIREVE_RETRIES = gql`
  query FetchDueGireveRetries($now: timestamptz!, $limit: Int!) {
    GireveBroadcastRetryQueues(
      where: { status: { _eq: "pending" }, nextRetryAt: { _lte: $now } }
      order_by: { nextRetryAt: asc }
      limit: $limit
    ) {
      id
      partnerTenantPartnerId
      cpoCountryCode
      cpoPartyId
      moduleId
      interfaceRole
      httpMethod
      resourceType
      resourceId
      ocpiPath
      payload
      attemptCount
      nextRetryAt
    }
  }
`;

export const CLAIM_GIREVE_BROADCAST_RETRIES = gql`
  mutation ClaimGireveBroadcastRetries($batchLimit: Int!) {
    claim_gireve_broadcast_retries(args: { batch_limit: $batchLimit }) {
      id
      partnerTenantPartnerId
      cpoCountryCode
      cpoPartyId
      moduleId
      interfaceRole
      httpMethod
      resourceType
      resourceId
      ocpiPath
      payload
      attemptCount
      nextRetryAt
    }
  }
`;

export const RELEASE_STALE_GIREVE_RETRY_LOCKS = gql`
  mutation ReleaseStaleGireveRetryLocks($staleBefore: timestamptz!) {
    update_GireveBroadcastRetryQueues(
      where: {
        status: { _eq: "processing" }
        lockedAt: { _lt: $staleBefore }
      }
      _set: {
        status: "pending"
        lockedAt: null
        updatedAt: $staleBefore
      }
    ) {
      affected_rows
    }
  }
`;

export const MARK_GIREVE_RETRY_SENT = gql`
  mutation MarkGireveRetrySent($id: uuid!, $sentAt: timestamptz!) {
    update_GireveBroadcastRetryQueues(
      where: { id: { _eq: $id }, status: { _eq: "processing" } }
      _set: {
        status: "sent"
        sentAt: $sentAt
        lastError: null
        lockedAt: null
        updatedAt: $sentAt
      }
    ) {
      affected_rows
    }
  }
`;

export const RESCHEDULE_GIREVE_RETRY = gql`
  mutation RescheduleGireveRetry(
    $id: uuid!
    $attemptCount: Int!
    $nextRetryAt: timestamptz!
    $lastError: String!
  ) {
    update_GireveBroadcastRetryQueues(
      where: { id: { _eq: $id }, status: { _eq: "processing" } }
      _set: {
        status: "pending"
        attemptCount: $attemptCount
        nextRetryAt: $nextRetryAt
        lastError: $lastError
        lockedAt: null
        updatedAt: $nextRetryAt
      }
    ) {
      affected_rows
    }
  }
`;
