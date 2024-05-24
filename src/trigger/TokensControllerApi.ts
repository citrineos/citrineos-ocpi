import {BaseApi} from './BaseApi';
import {TokenResponse} from '../model/Token';
import {GetTokenParams} from './param/tokens/get.token.params';
import {PatchTokenParams} from './param/tokens/patch.token.params';
import {PutTokenParams} from './param/tokens/put.token.params';
import {OcpiEmptyResponse} from '../model/ocpi.empty.response';
import {IHeaders, IRequestQueryParams} from 'typed-rest-client/Interfaces';


export class TokensControllerApi extends BaseApi {
  async getToken(
    params: GetTokenParams
  ): Promise<TokenResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'tokenId',
    );
    const queryParameters: IRequestQueryParams = this.newQueryParams();
    queryParameters.params['type'] = params.type as string;
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get<TokenResponse>({
      version: params.version,
      path: '{countryCode}/{partyId}/{tokenId}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('tokenId', encodeURIComponent(params.tokenId)),
      additionalHeaders,
      queryParameters
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
    const queryParameters: IRequestQueryParams = this.newQueryParams();
    queryParameters.params['type'] = params.type as string;
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return this.update<OcpiEmptyResponse>({
      version: params.version,
      path: '{countryCode}/{partyId}/{tokenId}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('tokenId', encodeURIComponent(params.tokenId)),
      additionalHeaders,
      queryParameters
    }, params.requestBody);
  }

  async putToken(
    params: PutTokenParams
  ): Promise<OcpiEmptyResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'tokenId',
      'token',
    );
    const queryParameters: IRequestQueryParams = this.newQueryParams();

    queryParameters.params['type'] = params.type as string;
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.replace<OcpiEmptyResponse>({
      version: params.version,
      path: '{countryCode}/{partyId}/{tokenId}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('tokenId', encodeURIComponent(params.tokenId)),
      additionalHeaders,
      queryParameters
    }, params.token);
  }
}
