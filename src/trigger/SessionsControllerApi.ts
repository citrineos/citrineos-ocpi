import {getOcpiHeaders, setAuthHeader, } from './util';
import {BaseAPI, HTTPHeaders} from './BaseApi';
import {OcpiResponse} from '../model/ocpi.response';
import {Session} from '../model/Session';
import {GetSessionParams} from './param/sessions/get.session.params';
import {PatchSessionParams} from './param/sessions/patch.session.params';
import {PutSessionParams} from './param/sessions/put.session.params';

export class SessionsControllerApi extends BaseAPI {
  async getSession(params: GetSessionParams): Promise<OcpiResponse<Session>> {

    this.validateOcpiParams(params);

    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'sessionId',
    );

    const headerParameters: HTTPHeaders =
      getOcpiHeaders(params);

    setAuthHeader(headerParameters);
    return await this.request({
      path: `${this.getBasePath(params)}/{countryCode}/{partyId}/{sessionId}`
        .replace(
          'countryCode',
          encodeURIComponent(String(params.countryCode)),
        )
        .replace(
          'partyId',
          encodeURIComponent(String(params.partyId)),
        )
        .replace(
          'sessionId',
          encodeURIComponent(String(params.sessionId)),
        ),
      method: 'GET',
      headers: headerParameters,
    });
  }

  async patchSession(params: PatchSessionParams): Promise<OcpiResponse<void>> {

    this.validateOcpiParams(params);

    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'sessionId',
      'requestBody',
    );

    const headerParameters: HTTPHeaders =
      getOcpiHeaders(params);

    setAuthHeader(headerParameters);
    return await this.request({
      path: `${this.getBasePath(params)}/{countryCode}/{partyId}/{sessionId}`
        .replace(
          'countryCode',
          encodeURIComponent(String(params.countryCode)),
        )
        .replace(
          'partyId',
          encodeURIComponent(String(params.partyId)),
        )
        .replace(
          'sessionId',
          encodeURIComponent(String(params.sessionId)),
        ),
      method: 'PATCH',
      headers: headerParameters,
      body: params.requestBody,
    });
  }

  async putSession(params: PutSessionParams): Promise<OcpiResponse<void>> {

    this.validateOcpiParams(params);

    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'sessionId',
      'session',
    );

    const headerParameters: HTTPHeaders =
      getOcpiHeaders(params);

    setAuthHeader(headerParameters);
    return await this.request({
      path: `${this.getBasePath(params)}/{countryCode}/{partyId}/{sessionId}`
        .replace(
          'countryCode',
          encodeURIComponent(String(params.countryCode)),
        )
        .replace(
          'partyId',
          encodeURIComponent(String(params.partyId)),
        )
        .replace(
          'sessionId',
          encodeURIComponent(String(params.sessionId)),
        ),
      method: 'PUT',
      headers: headerParameters,
      body: params.session,
    });
  }
}
