// todo prefix to prevent collisions with Namespace in core but should find a better way to handle this.

export enum OcpiNamespace {
  Credentials = 'Credentials',
  Version = 'Version',
  Endpoint = 'Endpoints',
  Cdrs = 'Cdrs',
  Tariffs = 'Tariffs',
  ChargingProfiles = 'ChargingProfiles',
  Commands = 'Commands',
  Locations = 'Locations',
  Sessions = 'Sessions',
  Tokens = 'Tokens',
  ClientInformation = 'ClientInformation',
  ClientCredentialsRole = 'ClientCredentialsRole',
  ServerCredentialsRole = 'ServerCredentialsRole',
  CpoTenant = 'CpoTenant',
}
