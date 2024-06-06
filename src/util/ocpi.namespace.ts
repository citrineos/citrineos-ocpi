// todo prefixing for now to prevent collisions with Namespace in core but should find a better way to handle this.
export enum OcpiNamespace {
  Credentials = 'OCPI_Credentials',
  Version = 'OCPI_Version',
  Endpoint = 'OCPI_Endpoint',
  Cdrs = 'OCPI_Cdrs',
  Tariffs = 'OCPI_Tariffs',
  ChargingProfiles = 'OCPI_ChargingProfiles',
  Commands = 'OCPI_Commands',
  Locations = 'OCPI_Locations',
  Sessions = 'OCPI_Sessions',
  Tokens = 'OCPI_Tokens',
}
