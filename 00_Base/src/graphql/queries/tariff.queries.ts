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
      paymentFee
      pricePerKwh
      pricePerMin
      pricePerSession
      stationId
      taxRate
      updatedAt
      Tenant {
        countryCode
        partyId
      }
    }
  }
`;

export const GET_TARIFFS_QUERY = gql`
  query GetTariffs(
    $limit: Int
    $offset: Int
    $dateFrom: timestamptz
    $dateTo: timestamptz
    $countryCode: String
    $partyId: String
  ) {
    Tariffs(
      limit: $limit
      offset: $offset
      where: {
        Tenant: {
          countryCode: { _eq: $countryCode }
          partyId: { _eq: $partyId }
        }
        updatedAt: { _gte: $dateFrom, _lte: $dateTo }
      }
    ) {
      authorizationAmount
      createdAt
      currency
      id
      paymentFee
      pricePerKwh
      pricePerMin
      pricePerSession
      stationId
      taxRate
      updatedAt
      Tenant {
        countryCode
        partyId
      }
    }
    Tariffs_aggregate(
      where: {
        Tenant: {
          countryCode: { _eq: $countryCode }
          partyId: { _eq: $partyId }
        }
        updatedAt: { _gte: $dateFrom, _lte: $dateTo }
      }
    ) {
      aggregate {
        count
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
          paymentFee
          pricePerKwh
          pricePerMin
          pricePerSession
          stationId
          taxRate
          updatedAt
        ]
      }
    ) {
      id
      authorizationAmount
      createdAt
      currency
      paymentFee
      pricePerKwh
      pricePerMin
      pricePerSession
      stationId
      taxRate
      updatedAt
      Tenant {
        countryCode
        partyId
      }
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
