import { GetSessionParams } from './param/sessions/get.session.params';
import { PatchSessionParams } from './param/sessions/patch.session.params';
import { PutSessionParams } from './param/sessions/put.session.params';
import { IHeaders } from 'typed-rest-client/Interfaces';
import { BaseClientApi } from './BaseClientApi';
import { SessionResponse } from '../model/Session';
import { Service } from 'typedi';
import { OcpiEmptyResponse } from '../model/ocpi.empty.response';
import { ModuleId } from '../model/ModuleId';

@Service()
export class SessionsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Sessions;

  constructor() {
    super();
  }

  async getSession(params: GetSessionParams): Promise<SessionResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'countryCode', 'partyId', 'sessionId');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get(SessionResponse, {
      version: params.version,
      path: '{countryCode}/{partyId}/{sessionId}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('sessionId', encodeURIComponent(params.sessionId)),
      additionalHeaders,
    });
  }

  async patchSession(params: PatchSessionParams): Promise<OcpiEmptyResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'sessionId',
      'requestBody',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.update(
      OcpiEmptyResponse,
      {
        version: params.version,
        path: '{countryCode}/{partyId}/{sessionId}'
          .replace('countryCode', encodeURIComponent(params.fromCountryCode))
          .replace('partyId', encodeURIComponent(params.fromPartyId))
          .replace('sessionId', encodeURIComponent(params.sessionId)),
        additionalHeaders,
      },
      params.requestBody,
    );
  }

  async putSession(params: PutSessionParams): Promise<OcpiEmptyResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'sessionId',
      'session',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.update(
      OcpiEmptyResponse,
      {
        version: params.version,
        path: '{countryCode}/{partyId}/{sessionId}'
          .replace('countryCode', encodeURIComponent(params.fromCountryCode))
          .replace('partyId', encodeURIComponent(params.fromPartyId))
          .replace('sessionId', encodeURIComponent(params.sessionId)),
        additionalHeaders,
      },
      params.session,
    );
  }
}
