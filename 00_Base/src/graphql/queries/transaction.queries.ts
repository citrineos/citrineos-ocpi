import { gql } from 'graphql-request';

export const GET_TRANSACTIONS_QUERY = gql`
  query GetTransactions(
    $offset: Int
    $limit: Int
    $where: Transactions_bool_exp!
  ) {
    Transactions(
      offset: $offset
      limit: $limit
      order_by: { createdAt: asc }
      where: $where
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
      evse: Evse {
        id
      }
      chargingStation: ChargingStation {
        connectors: Connectors {
          id
          connectorId
        }
        location: Location {
          id
          name
          address
          city
          postalCode
          state
          country
          coordinates
        }
      }
      transactionEvents: TransactionEvents {
        id
        eventType
        EvseType {
          id
        }
        transactionInfo
      }
      startTransaction: StartTransaction {
        timestamp
      }
      stopTransaction: StopTransaction {
        timestamp
      }
      meterValues: MeterValues {
        timestamp
        sampledValue
      }
    }
  }
`;
