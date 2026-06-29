// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { gql } from 'graphql-request';

export const GET_TARIFF_BY_KEY_QUERY = gql`
  query GetTariffByKey($id: Int!, $countryCode: String!, $partyId: String!) {
    Tariffs(
      where: {
        id: { _eq: $id }
        Tenant: {
          countryCode: { _eq: $countryCode }
          partyId: { _eq: $partyId }
        }
      }
    ) {
      authorizationAmount
      createdAt
      currency
      id
      ocpiTariffId
      paymentFee
      pricePerKwh
      pricePerMin
      pricePerSession
      stationId
      taxRate
      tariffAltText
      tenantPartnerId
      updatedAt
      tenant: Tenant {
        countryCode
        partyId
      }
    }
  }
`;

export const GET_TARIFF_FOR_BROADCAST_QUERY = gql`
  query GetTariffForBroadcast(
    $id: Int!
    $countryCode: String!
    $partyId: String!
  ) {
    Tariffs(
      where: {
        id: { _eq: $id }
        tenantPartnerId: { _is_null: true }
        Tenant: {
          countryCode: { _eq: $countryCode }
          partyId: { _eq: $partyId }
        }
      }
    ) {
      id
      ocpiTariffId
      currency
      updatedAt
      startDateTime
      endDateTime
      tariffType
      tariffAltUrl
      minPrice
      maxPrice
      energyMix
      tariffAltText
      tenantPartnerId
      TariffElements {
        id
        priceComponents
        restrictions
      }
      tenant: Tenant {
        countryCode
        partyId
      }
    }
  }
`;

export const GET_TARIFFS_QUERY = gql`
  query GetTariffs($limit: Int, $offset: Int, $where: Tariffs_bool_exp!) {
    Tariffs(
      limit: $limit
      offset: $offset
      order_by: { createdAt: asc }
      where: $where
    ) {
      authorizationAmount
      createdAt
      currency
      id
      ocpiTariffId
      tariffAltText
      tenantPartnerId
      updatedAt
      startDateTime
      endDateTime
      tariffType
      tariffAltUrl
      minPrice
      maxPrice
      energyMix
      startDateTime
      endDateTime
      TariffElements {
        id
        priceComponents
        restrictions
      }
      tenant: Tenant {
        countryCode
        partyId
      }
    }
  }
`;

export const CREATE_OR_UPDATE_TARIFF_MUTATION = gql`
  mutation CreateOrUpdateTariff($object: Tariffs_insert_input!) {
    insert_Tariffs_one(
      object: $object
      on_conflict: {
        constraint: Tariffs_pkey
        update_columns: [
          authorizationAmount
          createdAt
          currency
          ocpiTariffId
          paymentFee
          pricePerKwh
          pricePerMin
          pricePerSession
          stationId
          tariffAltText
          tariffType
          tariffType
          tariffAltUrl
          minPrice
          maxPrice
          energyMix
          startDateTime
          endDateTime
          taxRate
          tenantPartnerId
          updatedAt
        ]
      }
    ) {
      id
      ocpiTariffId
      authorizationAmount
      createdAt
      currency
      paymentFee
      pricePerKwh
      pricePerMin
      pricePerSession
      stationId
      taxRate
      tariffAltText
      tenantPartnerId
      updatedAt
      tariffType
      tariffAltUrl
      minPrice
      maxPrice
      energyMix
      startDateTime
      endDateTime
      tenant: Tenant {
        countryCode
        partyId
      }
      tenantPartner: TenantPartner {
        id
        countryCode
        partyId
      }
    }
  }
`;

/** Upsert for tariffs received from a partner CPO. Conflicts on (ocpiTariffId, tenantPartnerId). */
export const CREATE_OR_UPDATE_PARTNER_TARIFF_MUTATION = gql`
  mutation CreateOrUpdatePartnerTariff($object: Tariffs_insert_input!) {
    insert_Tariffs_one(
      object: $object
      on_conflict: {
        constraint: Tariffs_ocpiTariffId_tenantPartnerId_key
        update_columns: [
          currency
          ocpiTariffId
          paymentFee
          pricePerKwh
          pricePerMin
          pricePerSession
          stationId
          tariffAltText
          tariffType
          tariffAltUrl
          minPrice
          maxPrice
          energyMix
          startDateTime
          endDateTime
          taxRate
          updatedAt
        ]
      }
    ) {
      id
      ocpiTariffId
      authorizationAmount
      createdAt
      currency
      paymentFee
      pricePerKwh
      pricePerMin
      pricePerSession
      stationId
      taxRate
      tariffAltText
      tariffType
      tariffAltUrl
      minPrice
      maxPrice
      energyMix
      startDateTime
      endDateTime
      tenantPartnerId
      updatedAt
      tenant: Tenant {
        countryCode
        partyId
      }
      TariffElements {
        id
        priceComponents
        restrictions
      }
      tenantPartner: TenantPartner {
        id
        countryCode
        partyId
      }
      roamingPartnerId
    }
  }
`;

export const CREATE_OR_UPDATE_PARTNER_TARIFF_MUTATION_ROAMING_PARTNER = gql`
  mutation CreateOrUpdatePartnerTariffRoamingPartner(
    $object: Tariffs_insert_input!
  ) {
    insert_Tariffs_one(
      object: $object
      on_conflict: {
        constraint: Tariffs_ocpiTariffId_tenantPartnerId_roamingPartnerId_key
        update_columns: [
          currency
          ocpiTariffId
          paymentFee
          pricePerKwh
          pricePerMin
          pricePerSession
          stationId
          tariffAltText
          tariffType
          tariffAltUrl
          minPrice
          maxPrice
          energyMix
          startDateTime
          endDateTime
          taxRate
          updatedAt
        ]
      }
    ) {
      id
      ocpiTariffId
      authorizationAmount
      createdAt
      currency
      paymentFee
      pricePerKwh
      pricePerMin
      pricePerSession
      stationId
      taxRate
      tariffAltText
      tariffType
      tariffAltUrl
      minPrice
      maxPrice
      energyMix
      startDateTime
      endDateTime
      tenantPartnerId
      updatedAt
      tenant: Tenant {
        countryCode
        partyId
      }
      TariffElements {
        id
        priceComponents
        restrictions
      }
      tenantPartner: TenantPartner {
        id
        countryCode
        partyId
      }
      roamingPartnerId
    }
  }
`;

export const DELETE_TARIFF_MUTATION = gql`
  mutation DeleteTariff($id: Int!) {
    delete_Tariffs_by_pk(id: $id) {
      id
    }
  }
`;

/** Delete a partner tariff by its OCPI tariff ID and tenantPartnerId. */
export const DELETE_TARIFF_BY_PARTNER_MUTATION = gql`
  mutation DeleteTariffByPartner(
    $ocpiTariffId: String!
    $tenantPartnerId: Int!
  ) {
    delete_Tariffs(
      where: {
        ocpiTariffId: { _eq: $ocpiTariffId }
        tenantPartnerId: { _eq: $tenantPartnerId }
      }
    ) {
      affected_rows
    }
  }
`;

export const DELETE_TARIFF_BY_ROAMING_PARTNER_MUTATION = gql`
  mutation DeleteTariffByRoamingPartner(
    $ocpiTariffId: String!
    $tenantPartnerId: Int!
    $roamingPartnerId: Int!
  ) {
    delete_Tariffs(
      where: {
        ocpiTariffId: { _eq: $ocpiTariffId }
        tenantPartnerId: { _eq: $tenantPartnerId }
        roamingPartnerId: { _eq: $roamingPartnerId }
      }
    ) {
      affected_rows
    }
  }
`;

export const GET_TARIFF_BY_OCPI_ID_QUERY = gql`
  query GetTariffByOcpiId(
    $ocpiTariffId: String!
    $countryCode: String!
    $partyId: String!
  ) {
    Tariffs(
      where: {
        ocpiTariffId: { _eq: $ocpiTariffId }
        Tenant: {
          countryCode: { _eq: $countryCode }
          partyId: { _eq: $partyId }
        }
      }
    ) {
      authorizationAmount
      createdAt
      currency
      id
      ocpiTariffId
      paymentFee
      pricePerKwh
      pricePerMin
      pricePerSession
      stationId
      taxRate
      tariffAltText
      tariffType
      tariffAltUrl
      minPrice
      maxPrice
      energyMix
      startDateTime
      endDateTime
      tenantPartnerId
      updatedAt
      tenant: Tenant {
        countryCode
        partyId
      }
      tenantPartner: TenantPartner {
        id
        countryCode
        partyId
      }
      TariffElements {
        id
        priceComponents
        restrictions
      }
    }
  }
`;

/** Filter by tenantPartnerId so we do not rely on Tariffs_bool_exp.TenantPartner (not always exposed). */
export const GET_TARIFF_BY_PARTNER_QUERY = gql`
  query GetTariffByPartner($ocpiTariffId: String!, $tenantPartnerId: Int!) {
    Tariffs(
      where: {
        ocpiTariffId: { _eq: $ocpiTariffId }
        tenantPartnerId: { _eq: $tenantPartnerId }
      }
    ) {
      authorizationAmount
      createdAt
      currency
      id
      ocpiTariffId
      paymentFee
      pricePerKwh
      pricePerMin
      pricePerSession
      stationId
      taxRate
      tariffAltText
      tariffType
      tariffAltUrl
      minPrice
      maxPrice
      energyMix
      startDateTime
      endDateTime
      tenantPartnerId
      updatedAt
      tenant: Tenant {
        countryCode
        partyId
      }
      tenantPartner: TenantPartner {
        id
        countryCode
        partyId
      }
      TariffElements {
        id
        priceComponents
        restrictions
      }
    }
  }
`;

export const GET_TARIFF_BY_PARTNER_ROAMING_PARTNER_QUERY = gql`
  query GetTariffByPartnerRoamingPartner(
    $ocpiTariffId: String!
    $tenantPartnerId: Int!
    $roamingPartnerId: Int!
  ) {
    Tariffs(
      where: {
        ocpiTariffId: { _eq: $ocpiTariffId }
        tenantPartnerId: { _eq: $tenantPartnerId }
        roamingPartnerId: { _eq: $roamingPartnerId }
      }
    ) {
      authorizationAmount
      createdAt
      currency
      id
      ocpiTariffId
      paymentFee
      pricePerKwh
      pricePerMin
      pricePerSession
      stationId
      taxRate
      tariffAltText
      tariffType
      tariffAltUrl
      minPrice
      maxPrice
      energyMix
      startDateTime
      endDateTime
      tenantPartnerId
      updatedAt
      tenant: Tenant {
        countryCode
        partyId
      }
      tenantPartner: TenantPartner {
        id
        countryCode
        partyId
      }
      TariffElements {
        id
        priceComponents
        restrictions
      }
    }
  }
`;

export const DELETE_TARIFF_ELEMENTS_MUTATION = gql`
  mutation DeleteTariffElements($tariffId: Int!) {
    delete_TariffElements(where: { tariffId: { _eq: $tariffId } }) {
      affected_rows
    }
  }
`;

export const GET_TARIFF_ID_BY_OCPI_ID_QUERY = gql`
  query GetTariffIdByOcpiId($ocpiTariffId: String!, $tenantPartnerId: Int!) {
    Tariffs(
      where: {
        ocpiTariffId: { _eq: $ocpiTariffId }
        tenantPartnerId: { _eq: $tenantPartnerId }
      }
    ) {
      id
    }
  }
`;

// new logic

export const FIND_PARTNER_TARIFF_QUERY = gql`
  query FindPartnerTariff(
    $ocpiTariffId: String!
    $tenantPartnerId: Int!
    $roamingPartnerId: Int
  ) {
    Tariffs(
      where: {
        ocpiTariffId: { _eq: $ocpiTariffId }
        tenantPartnerId: { _eq: $tenantPartnerId }
        roamingPartnerId: { _eq: $roamingPartnerId }
      }
      limit: 1
    ) {
      id
    }
  }
`;

export const FIND_PARTNER_TARIFF_P2P_QUERY = gql`
  query FindPartnerTariffP2p($ocpiTariffId: String!, $tenantPartnerId: Int!) {
    Tariffs(
      where: {
        ocpiTariffId: { _eq: $ocpiTariffId }
        tenantPartnerId: { _eq: $tenantPartnerId }
        roamingPartnerId: { _is_null: true }
      }
      limit: 1
    ) {
      id
    }
  }
`;

export const UPDATE_PARTNER_TARIFF_BY_PK_MUTATION = gql`
  mutation UpdatePartnerTariffByPk($id: Int!, $set: Tariffs_set_input!) {
    update_Tariffs_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
      ocpiTariffId
      authorizationAmount
      createdAt
      currency
      paymentFee
      pricePerKwh
      pricePerMin
      pricePerSession
      stationId
      taxRate
      tariffAltText
      tariffType
      tariffAltUrl
      minPrice
      maxPrice
      energyMix
      startDateTime
      endDateTime
      tenantPartnerId
      roamingPartnerId
      updatedAt
      tenant: Tenant {
        countryCode
        partyId
      }
      tenantPartner: TenantPartner {
        id
        countryCode
        partyId
      }
      TariffElements {
        id
        priceComponents
        restrictions
      }
    }
  }
`;

export const INSERT_PARTNER_TARIFF_MUTATION = gql`
  mutation InsertPartnerTariff($object: Tariffs_insert_input!) {
    insert_Tariffs_one(object: $object) {
      id
      ocpiTariffId
      authorizationAmount
      createdAt
      currency
      paymentFee
      pricePerKwh
      pricePerMin
      pricePerSession
      stationId
      taxRate
      tariffAltText
      tariffType
      tariffAltUrl
      minPrice
      maxPrice
      energyMix
      startDateTime
      endDateTime
      tenantPartnerId
      roamingPartnerId
      updatedAt
      tenant: Tenant {
        countryCode
        partyId
      }
      tenantPartner: TenantPartner {
        id
        countryCode
        partyId
      }
      TariffElements {
        id
        priceComponents
        restrictions
      }
    }
  }
`;

export const INSERT_TARIFF_ELEMENTS_MUTATION = gql`
  mutation InsertTariffElements($objects: [TariffElements_insert_input!]!) {
    insert_TariffElements(objects: $objects) {
      affected_rows
    }
  }
`;

export const UPDATE_PARTNER_TARIFF_MUTATION = gql`
  mutation UpdatePartnerTariff($id: Int!, $set: Tariffs_set_input!) {
    update_Tariffs_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
      ocpiTariffId
      authorizationAmount
      createdAt
      currency
      paymentFee
      pricePerKwh
      pricePerMin
      pricePerSession
      stationId
      taxRate
      tariffAltText
      tariffType
      tariffAltUrl
      minPrice
      maxPrice
      energyMix
      startDateTime
      endDateTime
      tenantPartnerId
      roamingPartnerId
      updatedAt
      tenant: Tenant {
        countryCode
        partyId
      }
      tenantPartner: TenantPartner {
        id
        countryCode
        partyId
      }
      TariffElements {
        id
        priceComponents
        restrictions
      }
    }
  }
`;

export const GET_TARIFFS_PAGINATED = gql`
  query GetTariffsPaginated(
    $limit: Int
    $offset: Int
    $where: Tariffs_bool_exp!
  ) {
    Tariffs(
      limit: $limit
      offset: $offset
      order_by: { createdAt: asc }
      where: $where
    ) {
      id
      createdAt
      updatedAt
      tenantPartner: TenantPartner {
        id
        countryCode
        partyId
      }
      authorizationAmount
      createdAt
      currency
      id
      ocpiTariffId
      tariffAltText
      tenantPartnerId
      updatedAt
      startDateTime
      endDateTime
      tariffType
      tariffAltUrl
      minPrice
      maxPrice
      energyMix
      startDateTime
      endDateTime
      TariffElements {
        id
        priceComponents
        restrictions
      }
      tenant: Tenant {
        countryCode
        partyId
      }
    }
  }
`;
