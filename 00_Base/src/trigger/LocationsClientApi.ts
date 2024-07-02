import {GetConnectorParams} from './param/locations/get.connector.params';
import {GetEvseParams} from './param/locations/get.evse.params';
import {GetLocationParams} from './param/locations/get.location.params';
import {PatchConnectorParams} from './param/locations/patch.connector.params';
import {PatchEvseParams} from './param/locations/patch.evse.params';
import {PatchLocationParams} from './param/locations/patch.location.params';
import {PutConnectorParams} from './param/locations/put.connector.params';
import {PutEvseParams} from './param/locations/put.evse.params';
import {PutLocationParams} from './param/locations/put.location.params';
import {IHeaders} from 'typed-rest-client/Interfaces';
import {BaseClientApi} from './BaseClientApi';
import {OcpiResponse} from '../model/ocpi.response';
import {ConnectorResponse} from "../model/DTO/ConnectorDTO";
import {LocationResponse} from "../model/DTO/LocationDTO";
import {EvseResponse} from "../model/DTO/EvseDTO";

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
    const url = '{countryCode}/{partyId}/{locationId}/{evseUId}/{connectorId}'
      .replace('countryCode', encodeURIComponent(params.fromCountryCode))
      .replace('partyId', encodeURIComponent(params.fromPartyId))
      .replace('locationId', encodeURIComponent(params.locationId))
      .replace('evseUId', encodeURIComponent(params.evseUid))
      .replace('connectorId', encodeURIComponent(params.connectorId));
    return await this.get<ConnectorResponse>(
      {
        additionalHeaders,
      },
      url,
    );
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
    const url = '{countryCode}/{partyId}/{locationId}/{evseUId}'
      .replace('countryCode', encodeURIComponent(params.fromCountryCode))
      .replace('partyId', encodeURIComponent(params.fromPartyId))
      .replace('locationId', encodeURIComponent(params.locationId))
      .replace('evseUId', encodeURIComponent(params.evseUid));
    return await this.get<EvseResponse>(
      {
        additionalHeaders,
      },
      url,
    );
  }

  async getLocation(params: GetLocationParams): Promise<LocationResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'countryCode', 'partyId', 'locationId');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    const url = '{countryCode}/{partyId}/{locationId}'
      .replace('countryCode', encodeURIComponent(params.fromCountryCode))
      .replace('partyId', encodeURIComponent(params.fromPartyId))
      .replace('locationId', encodeURIComponent(params.locationId));
    return await this.get<LocationResponse>(
      {
        additionalHeaders,
      },
      url,
    );
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
    const url = '{countryCode}/{partyId}/{locationId}/{evseUId}/{connectorId}'
      .replace('countryCode', encodeURIComponent(params.fromCountryCode))
      .replace('partyId', encodeURIComponent(params.fromPartyId))
      .replace('locationId', encodeURIComponent(params.locationId))
      .replace('evseUId', encodeURIComponent(params.evseUid))
      .replace('connectorId', encodeURIComponent(params.connectorId));
    return await this.update<OcpiResponse<void>>(
      {
        additionalHeaders,
      },
      params.requestBody,
      url,
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
    const url = '{countryCode}/{partyId}/{locationId}/{evseUId}'
      .replace('countryCode', encodeURIComponent(params.fromCountryCode))
      .replace('partyId', encodeURIComponent(params.fromPartyId))
      .replace('locationId', encodeURIComponent(params.locationId))
      .replace('evseUId', encodeURIComponent(params.evseUid));
    return await this.update<OcpiResponse<void>>(
      {
        additionalHeaders,
      },
      params.requestBody,
      url,
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
    const url = '{countryCode}/{partyId}/{locationId}'
      .replace('countryCode', encodeURIComponent(params.fromCountryCode))
      .replace('partyId', encodeURIComponent(params.fromPartyId))
      .replace('locationId', encodeURIComponent(params.locationId));
    return this.update<OcpiResponse<void>>(
      {
        additionalHeaders,
      },
      params.requestBody,
      url,
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
    const url = '{countryCode}/{partyId}/{locationId}/{evseUId}/{connectorId}'
      .replace('countryCode', encodeURIComponent(params.fromCountryCode))
      .replace('partyId', encodeURIComponent(params.fromPartyId))
      .replace('locationId', encodeURIComponent(params.locationId))
      .replace('evseUId', encodeURIComponent(params.evseUid))
      .replace('connectorId', encodeURIComponent(params.connectorId));
    return await this.replace<OcpiResponse<void>>(
      {
        additionalHeaders,
      },
      params.connector,
      url,
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
    const url = '{countryCode}/{partyId}/{locationId}/{evseUId}'
      .replace('countryCode', encodeURIComponent(params.fromCountryCode))
      .replace('partyId', encodeURIComponent(params.fromPartyId))
      .replace('locationId', encodeURIComponent(params.locationId))
      .replace('evseUId', encodeURIComponent(params.evseUid));
    return await this.replace<OcpiResponse<void>>(
      {
        additionalHeaders,
      },
      params.evse,
      url,
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
    const url = '{countryCode}/{partyId}/{locationId}'
      .replace('countryCode', encodeURIComponent(params.fromCountryCode))
      .replace('partyId', encodeURIComponent(params.fromPartyId))
      .replace('locationId', encodeURIComponent(params.locationId));
    return await this.replace<OcpiResponse<void>>(
      {
        additionalHeaders,
      },
      params.location,
      url,
    );
  }
}
