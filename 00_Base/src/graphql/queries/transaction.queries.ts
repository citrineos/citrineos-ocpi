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
    $endedOnly: Boolean
  ) {
    Transactions(
      where: {
        stationId: { _is_null: false }
        TransactionEvents: { IdToken: { Authorization: {} } }
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
      Evse {
        id
      }
      TransactionEvents {
        id
        eventType
      }
      MeterValues {
        id
      }
      StartTransaction {
        id
      }
      StopTransaction {
        id
      }
    }
    Transactions_aggregate(
      where: {
        stationId: { _is_null: false }
        TransactionEvents: { IdToken: { Authorization: { IdToken: {} } } }
        updatedAt: { _gte: $dateFrom, _lte: $dateTo }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;
