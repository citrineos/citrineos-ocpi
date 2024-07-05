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
import { BaseClientApi } from './BaseClientApi';
import { ConnectorResponse } from '../model/DTO/ConnectorDTO';
import { LocationResponse } from '../model/DTO/LocationDTO';
import { OcpiEmptyResponse } from '../model/ocpi.empty.response';
import { EvseResponse } from '../model/DTO/EvseDTO';
import { Service } from 'typedi';

@Service()
export class LocationsClientApi extends BaseClientApi {
  async getConnector(params: GetConnectorParams): Promise<ConnectorResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'evseUid',
      'connectorId',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get(ConnectorResponse, {
      version: params.version,
      path: '{countryCode}/{partyId}/{locationId}/{evseUid}/{connectorId}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('locationId', encodeURIComponent(params.locationId))
        .replace('evseUid', encodeURIComponent(params.evseUid))
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
      'evseUid',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get(EvseResponse, {
      version: params.version,
      path: '{countryCode}/{partyId}/{locationId}/{evseUid}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('locationId', encodeURIComponent(params.locationId))
        .replace('evseUid', encodeURIComponent(params.evseUid)),
      additionalHeaders,
    });
  }

  async getLocation(params: GetLocationParams): Promise<LocationResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'countryCode', 'partyId', 'locationId');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get(LocationResponse, {
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
  ): Promise<OcpiEmptyResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'evseUid',
      'connectorId',
      'requestBody',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.update(
      OcpiEmptyResponse,
      {
        version: params.version,
        path: '{countryCode}/{partyId}/{locationId}/{evseUid}/{connectorId}'
          .replace('countryCode', encodeURIComponent(params.fromCountryCode))
          .replace('partyId', encodeURIComponent(params.fromPartyId))
          .replace('locationId', encodeURIComponent(params.locationId))
          .replace('evseUid', encodeURIComponent(params.evseUid))
          .replace('connectorId', encodeURIComponent(params.connectorId)),
        additionalHeaders,
      },
      params.requestBody,
    );
  }

  async patchEvse(params: PatchEvseParams): Promise<OcpiEmptyResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'evseUid',
      'requestBody',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.update(
      OcpiEmptyResponse,
      {
        version: params.version,
        path: '{countryCode}/{partyId}/{locationId}/{evseUid}'
          .replace('countryCode', encodeURIComponent(params.fromCountryCode))
          .replace('partyId', encodeURIComponent(params.fromPartyId))
          .replace('locationId', encodeURIComponent(params.locationId))
          .replace('evseUid', encodeURIComponent(params.evseUid)),
        additionalHeaders,
      },
      params.requestBody,
    );
  }

  async patchLocation(params: PatchLocationParams): Promise<OcpiEmptyResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'requestBody',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return this.update(
      OcpiEmptyResponse,
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

  async putConnector(params: PutConnectorParams): Promise<OcpiEmptyResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'evseUid',
      'connectorId',
      'connector',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.update(
      OcpiEmptyResponse,
      {
        version: params.version,
        path: '{countryCode}/{partyId}/{locationId}/{evseUid}/{connectorId}'
          .replace('countryCode', encodeURIComponent(params.fromCountryCode))
          .replace('partyId', encodeURIComponent(params.fromPartyId))
          .replace('locationId', encodeURIComponent(params.locationId))
          .replace('evseUid', encodeURIComponent(params.evseUid))
          .replace('connectorId', encodeURIComponent(params.connectorId)),
        additionalHeaders,
      },
      params.connector,
    );
  }

  async putEvse(params: PutEvseParams): Promise<OcpiEmptyResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'evseUid',
      'evse',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.update(
      OcpiEmptyResponse,
      {
        version: params.version,
        path: '{countryCode}/{partyId}/{locationId}/{evseUid}'
          .replace('countryCode', encodeURIComponent(params.fromCountryCode))
          .replace('partyId', encodeURIComponent(params.fromPartyId))
          .replace('locationId', encodeURIComponent(params.locationId))
          .replace('evseUid', encodeURIComponent(params.evseUid)),
        additionalHeaders,
      },
      params.evse,
    );
  }

  async putLocation(params: PutLocationParams): Promise<OcpiEmptyResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'location',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.update(
      OcpiEmptyResponse,
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
