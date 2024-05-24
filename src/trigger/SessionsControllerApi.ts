import {BaseApi} from './BaseApi';
import {OcpiResponse} from '../model/ocpi.response';
import {Session} from '../model/Session';
import {GetSessionParams} from './param/sessions/get.session.params';
import {PatchSessionParams} from './param/sessions/patch.session.params';
import {PutSessionParams} from './param/sessions/put.session.params';
import {IHeaders} from 'typed-rest-client/Interfaces';

export class SessionsControllerApi extends BaseApi {
  async getSession(params: GetSessionParams): Promise<OcpiResponse<Session>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'sessionId',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get<OcpiResponse<Session>>({
      version: params.version,
      path: '{countryCode}/{partyId}/{sessionId}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('sessionId', encodeURIComponent(params.sessionId)),
      additionalHeaders,
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
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.update<OcpiResponse<void>>({
      version: params.version,
      path: '{countryCode}/{partyId}/{sessionId}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('sessionId', encodeURIComponent(params.sessionId)),
      additionalHeaders,
    }, params.requestBody);
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
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.replace<OcpiResponse<void>>({
      version: params.version,
      path: '{countryCode}/{partyId}/{sessionId}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('sessionId', encodeURIComponent(params.sessionId)),
      additionalHeaders,
    }, params.session);
  }
}
