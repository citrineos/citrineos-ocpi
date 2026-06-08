// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-request';

export const GET_CDR_BY_OUR_ID = gql`
  query GetCdrByiId(
    $countryCode: String!
    $partyId: String!
    $id: Int!
    $tenantPartnerId: Int!
  ) {
    Cdrs(
      where: {
        countryCode: { _eq: $countryCode }
        partyId: { _eq: $partyId }
        id: { _eq: $id }
        tenantPartnerId: { _eq: $tenantPartnerId }
      }
    ) {
      id
      ocpiCdrId
      countryCode
      partyId
      startDateTime
      endDateTime
      sessionId
      cdrToken
      authMethod
      authorizationReference
      cdrLocation
      meterId
      currency
      tariffs
      chargingPeriods
      signedData
      totalCost
      totalFixedCost
      totalEnergy
      totalEnergyCost
      totalTime
      totalTimeCost
      totalParkingTime
      totalParkingCost
      totalReservationCost
      remark
      invoiceReferenceId
      credit
      creditReferenceId
      homeChargingCompensation
      lastUpdated
      tenantId
      tenantPartnerId
      createdAt
      updatedAt
    }
  }
`;

export const GET_CDR_BY_OUR_ID_AND_ROAMING_PARTNER = gql`
  query GetCdrByiIdAndRoamingPartner(
    $countryCode: String!
    $partyId: String!
    $id: Int!
    $tenantPartnerId: Int!
    $roamingPartnerId: Int!
  ) {
    Cdrs(
      where: {
        countryCode: { _eq: $countryCode }
        partyId: { _eq: $partyId }
        id: { _eq: $id }
        tenantPartnerId: { _eq: $tenantPartnerId }
        roamingPartnerId: { _eq: $roamingPartnerId }
      }
    ) {
      id
      ocpiCdrId
      countryCode
      partyId
      startDateTime
      endDateTime
      sessionId
      cdrToken
      authMethod
      authorizationReference
      cdrLocation
      meterId
      currency
      tariffs
      chargingPeriods
      signedData
      totalCost
      totalFixedCost
      totalEnergy
      totalEnergyCost
      totalTime
      totalTimeCost
      totalParkingTime
      totalParkingCost
      totalReservationCost
      remark
      invoiceReferenceId
      credit
      creditReferenceId
      homeChargingCompensation
      lastUpdated
      tenantId
      tenantPartnerId
      createdAt
      updatedAt
    }
  }
`;

export const GET_CDRS_PAGINATED = gql`
  query GetCdrsPaginated($limit: Int, $offset: Int, $where: Cdrs_bool_exp!) {
    Cdrs(
      limit: $limit
      offset: $offset
      order_by: { lastUpdated: asc }
      where: $where
    ) {
      id
      ocpiCdrId
      countryCode
      partyId
      startDateTime
      endDateTime
      sessionId
      cdrToken
      authMethod
      authorizationReference
      cdrLocation
      meterId
      currency
      tariffs
      chargingPeriods
      signedData
      totalCost
      totalFixedCost
      totalEnergy
      totalEnergyCost
      totalTime
      totalTimeCost
      totalParkingTime
      totalParkingCost
      totalReservationCost
      remark
      invoiceReferenceId
      credit
      creditReferenceId
      homeChargingCompensation
      lastUpdated
      tenantId
      tenantPartnerId
      createdAt
      updatedAt
    }
  }
`;

export const INSERT_CDR_MUTATION = gql`
  mutation InsertCdr($object: Cdrs_insert_input!) {
    insert_Cdrs_one(object: $object) {
      id
      ocpiCdrId
      countryCode
      partyId
      startDateTime
      endDateTime
      sessionId
      cdrToken
      authMethod
      authorizationReference
      cdrLocation
      meterId
      currency
      tariffs
      chargingPeriods
      signedData
      totalCost
      totalFixedCost
      totalEnergy
      totalEnergyCost
      totalTime
      totalTimeCost
      totalParkingTime
      totalParkingCost
      totalReservationCost
      remark
      invoiceReferenceId
      credit
      creditReferenceId
      homeChargingCompensation
      lastUpdated
      tenantId
      tenantPartnerId
      createdAt
      updatedAt
      roamingPartnerId
    }
  }
`;

export const FIND_CDR_P2P_QUERY = gql`
  query FindCdrP2p($ocpiCdrId: String!, $tenantPartnerId: Int!) {
    Cdrs(
      where: {
        ocpiCdrId: { _eq: $ocpiCdrId }
        tenantPartnerId: { _eq: $tenantPartnerId }
        roamingPartnerId: { _is_null: true }
      }
      limit: 1
    ) {
      id
    }
  }
`;
export const FIND_CDR_ROAMING_QUERY = gql`
  query FindCdrRoaming(
    $ocpiCdrId: String!
    $tenantPartnerId: Int!
    $roamingPartnerId: Int!
  ) {
    Cdrs(
      where: {
        ocpiCdrId: { _eq: $ocpiCdrId }
        tenantPartnerId: { _eq: $tenantPartnerId }
        roamingPartnerId: { _eq: $roamingPartnerId }
      }
      limit: 1
    ) {
      id
    }
  }
`;
