import {getOcpiHeaders, setAuthHeader, } from './util';
import {BaseAPI, HTTPHeaders} from './BaseApi';
import {ConnectorResponse} from '../model/Connector';
import {EvseResponse} from '../model/Evse';
import {LocationResponse} from '../model/Location';
import {OcpiResponse} from '../model/ocpi.response';
import {GetConnectorParams} from './param/locations/get.connector.params';
import {GetEvseParams} from './param/locations/get.evse.params';
import {GetLocationParams} from './param/locations/get.location.params';
import {PatchConnectorParams} from './param/locations/patch.connector.params';
import {PatchEvseParams} from './param/locations/patch.evse.params';
import {PatchLocationParams} from './param/locations/patch.location.params';
import {PutConnectorParams} from './param/locations/put.connector.params';
import {PutEvseParams} from './param/locations/put.evse.params';
import {PutLocationParams} from './param/locations/put.location.params';

export class LocationsControllerApi extends BaseAPI {
  async getConnector(
    params: GetConnectorParams
  ): Promise<ConnectorResponse> {

    this.validateOcpiParams(params);

    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'evseUId',
      'connectorId',
    );

    const headerParameters: HTTPHeaders =
      getOcpiHeaders(params);

    setAuthHeader(headerParameters);
    return await this.request({
      path: `${this.getBasePath(params)}/{countryCode}/{partyId}/{locationId}/{evseUId}/{connectorId}`
        .replace(
          'countryCode',
          encodeURIComponent(String(params.countryCode)),
        )
        .replace(
          'partyId',
          encodeURIComponent(String(params.partyId)),
        )
        .replace(
          'locationId',
          encodeURIComponent(String(params.locationId)),
        )
        .replace(
          'evseUId',
          encodeURIComponent(String(params.evseUId)),
        )
        .replace(
          'connectorId',
          encodeURIComponent(String(params.connectorId)),
        ),
      method: 'GET',
      headers: headerParameters,
    });
  }

  async getEvse(
    params: GetEvseParams
  ): Promise<EvseResponse> {

    this.validateOcpiParams(params);

    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'evseUId',
    );

    const headerParameters: HTTPHeaders =
      getOcpiHeaders(params);

    setAuthHeader(headerParameters);
    return await this.request({
      path: `${this.getBasePath(params)}/{countryCode}/{partyId}/{locationId}/{evseUId}`
        .replace(
          'countryCode',
          encodeURIComponent(String(params.countryCode)),
        )
        .replace(
          'partyId',
          encodeURIComponent(String(params.partyId)),
        )
        .replace(
          'locationId',
          encodeURIComponent(String(params.locationId)),
        )
        .replace(
          'evseUId',
          encodeURIComponent(String(params.evseUId)),
        ),
      method: 'GET',
      headers: headerParameters,
    });
  }

  async getLocation(
    params: GetLocationParams
  ): Promise<LocationResponse> {

    this.validateOcpiParams(params);

    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
    );

    const headerParameters: HTTPHeaders =
      getOcpiHeaders(params);

    setAuthHeader(headerParameters);
    return await this.request({
      path: `${this.getBasePath(params)}/{countryCode}/{partyId}/{locationId}`
        .replace(
          'countryCode',
          encodeURIComponent(String(params.countryCode)),
        )
        .replace(
          'partyId',
          encodeURIComponent(String(params.partyId)),
        )
        .replace(
          'locationId',
          encodeURIComponent(String(params.locationId)),
        ),
      method: 'GET',
      headers: headerParameters,
    }) as any;
  }

  async patchConnector(
    params: PatchConnectorParams
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

    const headerParameters: HTTPHeaders =
      getOcpiHeaders(params);

    setAuthHeader(headerParameters);
    return await this.request({
      path: `${this.getBasePath(params)}/{countryCode}/{partyId}/{locationId}/{evseUId}/{connectorId}`
        .replace(
          'countryCode',
          encodeURIComponent(String(params.countryCode)),
        )
        .replace(
          'partyId',
          encodeURIComponent(String(params.partyId)),
        )
        .replace(
          'locationId',
          encodeURIComponent(String(params.locationId)),
        )
        .replace(
          'evseUId',
          encodeURIComponent(String(params.evseUId)),
        )
        .replace(
          'connectorId',
          encodeURIComponent(String(params.connectorId)),
        ),
      method: 'PATCH',
      headers: headerParameters,
      body: params.requestBody,
    });
  }

  async patchEvse(
    params: PatchEvseParams
  ): Promise<OcpiResponse<void>> {

    this.validateOcpiParams(params);

    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'evseUId',
      'requestBody',
    );

    const headerParameters: HTTPHeaders =
      getOcpiHeaders(params);

    setAuthHeader(headerParameters);
    return await this.request({
      path: `${this.getBasePath(params)}/{countryCode}/{partyId}/{locationId}/{evseUId}`
        .replace(
          'countryCode',
          encodeURIComponent(String(params.countryCode)),
        )
        .replace(
          'partyId',
          encodeURIComponent(String(params.partyId)),
        )
        .replace(
          'locationId',
          encodeURIComponent(String(params.locationId)),
        )
        .replace(
          'evseUId',
          encodeURIComponent(String(params.evseUId)),
        ),
      method: 'PATCH',
      headers: headerParameters,
      body: params.requestBody,
    });
  }

  async patchLocation(
    params: PatchLocationParams
  ): Promise<OcpiResponse<void>> {

    this.validateOcpiParams(params);

    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'requestBody',
    );

    const headerParameters: HTTPHeaders =
      getOcpiHeaders(params);

    setAuthHeader(headerParameters);
    return await this.request({
      path: `${this.getBasePath(params)}/{countryCode}/{partyId}/{locationId}`
        .replace(
          'countryCode',
          encodeURIComponent(String(params.countryCode)),
        )
        .replace(
          'partyId',
          encodeURIComponent(String(params.partyId)),
        )
        .replace(
          'locationId',
          encodeURIComponent(String(params.locationId)),
        ),
      method: 'PATCH',
      headers: headerParameters,
      body: params.requestBody,
    });
  }

  async putConnector(
    params: PutConnectorParams
  ): Promise<OcpiResponse<void>> {

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

    const headerParameters: HTTPHeaders =
      getOcpiHeaders(params);

    setAuthHeader(headerParameters);
    return await this.request({
      path: `${this.getBasePath(params)}/{countryCode}/{partyId}/{locationId}/{evseUId}/{connectorId}`
        .replace(
          'countryCode',
          encodeURIComponent(String(params.countryCode)),
        )
        .replace(
          'partyId',
          encodeURIComponent(String(params.partyId)),
        )
        .replace(
          'locationId',
          encodeURIComponent(String(params.locationId)),
        )
        .replace(
          'evseUId',
          encodeURIComponent(String(params.evseUId)),
        )
        .replace(
          'connectorId',
          encodeURIComponent(String(params.connectorId)),
        ),
      method: 'PUT',
      headers: headerParameters,
      body: params.connector,
    });
  }

  async putEvse(
    params: PutEvseParams
  ): Promise<OcpiResponse<void>> {

    this.validateOcpiParams(params);

    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'evseUId',
      'evse',
    );

    const headerParameters: HTTPHeaders =
      getOcpiHeaders(params);

    setAuthHeader(headerParameters);
    return await this.request({
      path: `${this.getBasePath(params)}/{countryCode}/{partyId}/{locationId}/{evseUId}`
        .replace(
          'countryCode',
          encodeURIComponent(String(params.countryCode)),
        )
        .replace(
          'partyId',
          encodeURIComponent(String(params.partyId)),
        )
        .replace(
          'locationId',
          encodeURIComponent(String(params.locationId)),
        )
        .replace(
          'evseUId',
          encodeURIComponent(String(params.evseUId)),
        ),
      method: 'PUT',
      headers: headerParameters,
      body: params.evse,
    });
  }

  async putLocation(
    params: PutLocationParams
  ): Promise<OcpiResponse<void>> {

    this.validateOcpiParams(params);

    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'locationId',
      'location',
    );

    const headerParameters: HTTPHeaders =
      getOcpiHeaders(params);

    setAuthHeader(headerParameters);
    return await this.request({
      path: `${this.getBasePath(params)}/{countryCode}/{partyId}/{locationId}`
        .replace(
          'countryCode',
          encodeURIComponent(String(params.countryCode)),
        )
        .replace(
          'partyId',
          encodeURIComponent(String(params.partyId)),
        )
        .replace(
          'locationId',
          encodeURIComponent(String(params.locationId)),
        ),
      method: 'PUT',
      headers: headerParameters,
      body: params.location,
    });
  }
}
