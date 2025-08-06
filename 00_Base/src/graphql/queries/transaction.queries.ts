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
