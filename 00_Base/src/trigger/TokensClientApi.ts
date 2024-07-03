import { PostTokenParams } from './param/tokens/postTokenParams';
import { IHeaders, IRequestQueryParams } from 'typed-rest-client/Interfaces';
import { AuthorizationInfoResponse } from '../model/AuthorizationInfo';
import { PaginatedOcpiParams } from './param/paginated.ocpi.params';
import { BaseClientApi } from './BaseClientApi';
import { PaginatedTokenResponse } from '../model/Token';

export class TokensClientApi extends BaseClientApi {
  async getTokens(
    params: PaginatedOcpiParams,
  ): Promise<PaginatedTokenResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'tokenId');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get(PaginatedTokenResponse, {
      version: params.version,
      additionalHeaders,
    });
  }

  async postToken(params: PostTokenParams): Promise<AuthorizationInfoResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'tokenId', 'token');
    const queryParameters: IRequestQueryParams = this.newQueryParams();
    queryParameters.params['type'] = params.type as string;
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.create(
      AuthorizationInfoResponse,
      {
        version: params.version,
        path: '{tokenId}/authorize'.replace(
          'tokenId',
          encodeURIComponent(params.tokenId),
        ),
        additionalHeaders,
        queryParameters,
      },
      params.locationReferences,
    );
  }
}
