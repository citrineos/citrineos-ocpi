import {getOcpiHeaders, setAuthHeader,} from './util';
import {BaseAPI, HTTPHeaders} from './BaseApi';
import {OcpiResponse} from '../util/ocpi.response';
import {TokenResponse} from '../model/Token';
import {GetTokenParams} from './params/token/get.token.params';
import {PatchTokenParams} from './params/token/patch.token.params';
import {PutTokenParams} from './params/token/put.token.params';
import {OcpiEmptyResponse} from "../util/ocpi.empty.response";


export class TokensControllerApi extends BaseAPI {
  async getToken(
    params: GetTokenParams
  ): Promise<TokenResponse> {

    this.validateOcpiParams(params);

    this.validateRequiredParam(
      params,
      'tokenId',
    );

    const queryParameters: any = {};

    if (params.type != null) {
      queryParameters['type'] = params.type;
    }

    const headerParameters: HTTPHeaders =
      getOcpiHeaders(params);

    setAuthHeader(headerParameters);
    return await this.request({
      path: `${this.getBasePath(params)}/tokens/{countryCode}/{partyId}/{tokenId}`
        .replace(
          'countryCode',
          encodeURIComponent(String(params.fromCountryCode)),
        )
        .replace(
          'partyId',
          encodeURIComponent(String(params.fromPartyId)),
        )
        .replace(
          'tokenId',
          encodeURIComponent(String(params.tokenId)),
        ),
      method: 'GET',
      headers: headerParameters,
      query: queryParameters,
    });
  }

  async patchToken(
    params: PatchTokenParams
  ): Promise<OcpiEmptyResponse> {

    this.validateOcpiParams(params);

    this.validateRequiredParam(
      params,
      'tokenId',
      'requestBody',
    );

    const queryParameters: any = {};

    if (params.type != null) {
      queryParameters['type'] = params.type;
    }

    const headerParameters: HTTPHeaders =
      getOcpiHeaders(params);

    setAuthHeader(headerParameters);
    return await this.request({
      path: `${this.getBasePath(params)}/tokens/{countryCode}/{partyId}/{tokenId}`
        .replace(
          'countryCode',
          encodeURIComponent(String(params.fromCountryCode)),
        )
        .replace(
          'partyId',
          encodeURIComponent(String(params.fromPartyId)),
        )
        .replace(
          'tokenId',
          encodeURIComponent(String(params.tokenId)),
        ),
      method: 'PATCH',
      headers: headerParameters,
      query: queryParameters,
      body: params.requestBody,
    });
  }

  async putToken(
    params: PutTokenParams
  ): Promise<OcpiResponse<void>> {

    this.validateOcpiParams(params);

    this.validateRequiredParam(
      params,
      'tokenId',
      'token',
    );

    const queryParameters: any = {};

    if (params.type != null) {
      queryParameters['type'] = params.type;
    }

    const headerParameters: HTTPHeaders =
      getOcpiHeaders(params);

    setAuthHeader(headerParameters);
    return await this.request({
      path: `${this.getBasePath(params)}/tokens/{countryCode}/{partyId}/{tokenId}`
        .replace(
          'countryCode',
          encodeURIComponent(String(params.fromCountryCode)),
        )
        .replace(
          'partyId',
          encodeURIComponent(String(params.fromPartyId)),
        )
        .replace(
          'tokenId',
          encodeURIComponent(String(params.tokenId)),
        ),
      method: 'PUT',
      headers: headerParameters,
      query: queryParameters,
      body: params.token,
    });
  }
}
