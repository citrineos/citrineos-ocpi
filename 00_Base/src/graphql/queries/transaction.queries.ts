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
      startTime
      endTime
      createdAt
      updatedAt
      evse: Evse {
        id
      }
      connector: Connector {
        id
        connectorId
      }
      chargingStation: ChargingStation {
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
      authorization: Authorization {
        id
        createdAt
        updatedAt
        tenantId
        tenantPartner: TenantPartner {
          id
          countryCode
          partyId
        }
        groupAuthorization: GroupAuthorization {
          idToken
        }
        idToken
        idTokenType
        additionalInfo
        status
        realTimeAuth
        language1
      }
      tariff: Tariff {
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
        tariffAltText
        updatedAt
        tenant: Tenant {
          countryCode
          partyId
        }
      }
    }
  }
`;

export const GET_TRANSACTION_BY_TRANSACTION_ID_QUERY = gql`
  query GetTransactionByTransactionId($transactionId: String!) {
    Transactions(where: { transactionId: { _eq: $transactionId } }) {
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
      startTime
      endTime
      createdAt
      updatedAt
      evse: Evse {
        id
      }
      connector: Connector {
        id
        connectorId
      }
      chargingStation: ChargingStation {
        id
        tenantId
        isOnline
        protocol
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
      authorization: Authorization {
        id
        createdAt
        updatedAt
        tenantId
        tenantPartner: TenantPartner {
          id
          countryCode
          partyId
        }
        groupAuthorization: GroupAuthorization {
          idToken
        }
        idToken
        idTokenType
        additionalInfo
        status
        realTimeAuth
        language1
      }
      tariff: Tariff {
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
        tariffAltText
        updatedAt
        tenant: Tenant {
          countryCode
          partyId
        }
      }
    }
  }
`;
