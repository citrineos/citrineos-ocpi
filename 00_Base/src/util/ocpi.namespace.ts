import { Views } from '../sql/views';

export enum OcpiNamespace {
  Credentials = 'Credentials',
  Version = 'Version',
  Endpoint = 'Endpoint',
  Cdrs = 'Cdrs',
  OcpiTariff = 'OcpiTariff',
  ChargingProfiles = 'ChargingProfiles',
  Commands = 'Commands',
  Sessions = 'Sessions',
  OcpiToken = 'OcpiToken',
  ClientInformation = 'ClientInformation',
  ClientCredentialsRole = 'ClientCredentialsRole',
  ServerCredentialsRole = 'ServerCredentialsRole',
  CpoTenant = 'CpoTenant',
  OcpiLocation = 'OcpiLocation',
  OcpiEvse = 'OcpiEvse',
  OcpiConnector = 'OcpiConnector',
  ResponseUrlCorrelationId = 'ResponseUrlCorrelationId',
  TransactionsWithPartyIdAndCountryCode = Views.ViewTransactionsWithPartyIdAndCountryCodes,
}
