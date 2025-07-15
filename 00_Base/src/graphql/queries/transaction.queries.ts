import { gql } from 'graphql-request';

export const GET_TRANSACTIONS_QUERY = gql`
  query GetTransactions(
    $cpoCountryCode: String
    $cpoPartyId: String
    $mspCountryCode: String
    $mspPartyId: String
    $dateFrom: timestamptz
    $dateTo: timestamptz
    $offset: Int
    $limit: Int
  ) {
    Transactions(
      where: {
        stationId: { _is_null: false }
        ChargingStation: {
          Tenant: {
            countryCode: { _eq: $cpoCountryCode }
            partyId: { _eq: $cpoPartyId }
            TenantPartners: {
              countryCode: { _eq: $mspCountryCode }
              partyId: { _eq: $mspPartyId }
            }
          }
        }
        updatedAt: { _gte: $dateFrom, _lte: $dateTo }
      }
      offset: $offset
      limit: $limit
      order_by: { createdAt: asc }
    ) {
      id
      stationId
      transactionId
      isActive
      chargingState
      timeSpentCharging
      totalKwh
      stoppedReason
      remoteStartId
      totalCost
      createdAt
      updatedAt
      TransactionEvents {
        id
        eventType
        Evse {
          id
        }
        transactionInfo
      }
      StartTransaction {
        timestamp
      }
      StopTransaction {
        timestamp
      }
      MeterValues {
        timestamp
        sampledValue
      }
    }
    Transactions_aggregate(
      where: {
        stationId: { _is_null: false }
        ChargingStation: {
          Tenant: {
            countryCode: { _eq: $cpoCountryCode }
            partyId: { _eq: $cpoPartyId }
            TenantPartners: {
              countryCode: { _eq: $mspCountryCode }
              partyId: { _eq: $mspPartyId }
            }
          }
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
