import { BaseClientApi } from '../../../00_Base/src/trigger/BaseClientApi';
import { ConnectorResponse } from '../model/Connector';
import { EvseResponse } from '../model/Evse';
import { LocationResponse } from '../model/Location';
import { OcpiResponse } from '../model/ocpi.response';
import { GetConnectorParams } from './param/locations/get.connector.params';
import { GetEvseParams } from './param/locations/get.evse.params';
import { GetLocationParams } from './param/locations/get.location.params';
import { PatchConnectorParams } from './param/locations/patch.connector.params';
import { PatchEvseParams } from './param/locations/patch.evse.params';
import { PatchLocationParams } from './param/locations/patch.location.params';
import { PutConnectorParams } from './param/locations/put.connector.params';
import { PutEvseParams } from './param/locations/put.evse.params';
import { PutLocationParams } from './param/locations/put.location.params';
import { IHeaders } from 'typed-rest-client/Interfaces';

export class LocationsClientApi extends BaseClientApi {
  async getConnector(params: GetConnectorParams): Promise<ConnectorResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'evseUId',
      'connectorId',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get<ConnectorResponse>({
      version: params.version,
      path: '{countryCode}/{partyId}/{locationId}/{evseUId}/{connectorId}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('locationId', encodeURIComponent(params.locationId))
        .replace('evseUId', encodeURIComponent(params.evseUId))
        .replace('connectorId', encodeURIComponent(params.connectorId)),
      additionalHeaders,
    });
  }

  async getEvse(params: GetEvseParams): Promise<EvseResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'evseUId',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get<EvseResponse>({
      version: params.version,
      path: '{countryCode}/{partyId}/{locationId}/{evseUId}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('locationId', encodeURIComponent(params.locationId))
        .replace('evseUId', encodeURIComponent(params.evseUId)),
      additionalHeaders,
    });
  }

  async getLocation(params: GetLocationParams): Promise<LocationResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'countryCode', 'partyId', 'locationId');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get<LocationResponse>({
      version: params.version,
      path: '{countryCode}/{partyId}/{locationId}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('locationId', encodeURIComponent(params.locationId)),
      additionalHeaders,
    });
  }

  async patchConnector(
    params: PatchConnectorParams,
  ): Promise<OcpiResponse<void>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'evseUId',
      'connectorId',
      'requestBody',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.update<OcpiResponse<void>>(
      {
        version: params.version,
        path: '{countryCode}/{partyId}/{locationId}/{evseUId}/{connectorId}'
          .replace('countryCode', encodeURIComponent(params.fromCountryCode))
          .replace('partyId', encodeURIComponent(params.fromPartyId))
          .replace('locationId', encodeURIComponent(params.locationId))
          .replace('evseUId', encodeURIComponent(params.evseUId))
          .replace('connectorId', encodeURIComponent(params.connectorId)),
        additionalHeaders,
      },
      params.requestBody,
    );
  }

  async patchEvse(params: PatchEvseParams): Promise<OcpiResponse<void>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'evseUId',
      'requestBody',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.update<OcpiResponse<void>>(
      {
        version: params.version,
        path: '{countryCode}/{partyId}/{locationId}/{evseUId}'
          .replace('countryCode', encodeURIComponent(params.fromCountryCode))
          .replace('partyId', encodeURIComponent(params.fromPartyId))
          .replace('locationId', encodeURIComponent(params.locationId))
          .replace('evseUId', encodeURIComponent(params.evseUId)),
        additionalHeaders,
      },
      params.requestBody,
    );
  }

  async patchLocation(
    params: PatchLocationParams,
  ): Promise<OcpiResponse<void>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'requestBody',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return this.update<OcpiResponse<void>>(
      {
        version: params.version,
        path: '{countryCode}/{partyId}/{locationId}'
          .replace('countryCode', encodeURIComponent(params.fromCountryCode))
          .replace('partyId', encodeURIComponent(params.fromPartyId))
          .replace('locationId', encodeURIComponent(params.locationId)),
        additionalHeaders,
      },
      params.requestBody,
    );
  }

  async putConnector(params: PutConnectorParams): Promise<OcpiResponse<void>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'evseUId',
      'connectorId',
      'connector',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.replace<OcpiResponse<void>>(
      {
        version: params.version,
        path: '{countryCode}/{partyId}/{locationId}/{evseUId}/{connectorId}'
          .replace('countryCode', encodeURIComponent(params.fromCountryCode))
          .replace('partyId', encodeURIComponent(params.fromPartyId))
          .replace('locationId', encodeURIComponent(params.locationId))
          .replace('evseUId', encodeURIComponent(params.evseUId))
          .replace('connectorId', encodeURIComponent(params.connectorId)),
        additionalHeaders,
      },
      params.connector,
    );
  }

  async putEvse(params: PutEvseParams): Promise<OcpiResponse<void>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'evseUId',
      'evse',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.replace<OcpiResponse<void>>(
      {
        version: params.version,
        path: '{countryCode}/{partyId}/{locationId}/{evseUId}'
          .replace('countryCode', encodeURIComponent(params.fromCountryCode))
          .replace('partyId', encodeURIComponent(params.fromPartyId))
          .replace('locationId', encodeURIComponent(params.locationId))
          .replace('evseUId', encodeURIComponent(params.evseUId)),
        additionalHeaders,
      },
      params.evse,
    );
  }

  async putLocation(params: PutLocationParams): Promise<OcpiResponse<void>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'location',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.replace<OcpiResponse<void>>(
      {
        version: params.version,
        path: '{countryCode}/{partyId}/{locationId}'
          .replace('countryCode', encodeURIComponent(params.fromCountryCode))
          .replace('partyId', encodeURIComponent(params.fromPartyId))
          .replace('locationId', encodeURIComponent(params.locationId)),
        additionalHeaders,
      },
      params.location,
    );
  }
}
