import { PostTokenParams } from './param/tokens/postTokenParams';
import { IHeaders, IRequestQueryParams } from 'typed-rest-client/Interfaces';
import { AuthorizationInfoResponse } from '../model/AuthorizationInfo';
import { PaginatedOcpiParams } from './param/paginated.ocpi.params';
import { BaseClientApi, TriggerRequestOptions } from './BaseClientApi';
import { PaginatedTokenResponse } from '../model/OCPIToken';
import { VersionNumber } from '../model/VersionNumber';
import { Service } from 'typedi';
import { ModuleId } from '../model/ModuleId';

@Service()
export class TokensClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Tokens;

  async getTokens(
    params: PaginatedOcpiParams,
  ): Promise<PaginatedTokenResponse> {

    this.validateOcpiParams(params);
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);

      const options = {
        version: params.version ?? VersionNumber.TWO_DOT_TWO_DOT_ONE,
        additionalHeaders,
      } as TriggerRequestOptions;

    if (params.offset || params.limit || params.date_from || params.date_to) {
      const queryParameters: IRequestQueryParams = this.newQueryParams();
      if (params.offset) {
        queryParameters.params['offset'] = params.offset;
      }
      if (params.limit) {
        queryParameters.params['limit'] = params.limit;
      }
      if (params.date_from) {
        queryParameters.params['date_from'] = new Date(
          params.date_from,
        ).toISOString();
      }
      if (params.date_to) {
        queryParameters.params['date_to'] = new Date(
          params.date_to,
        ).toISOString();
      }
      options.queryParameters = queryParameters;
    }

    return await this.get(PaginatedTokenResponse, {
      version: params.version,
      additionalHeaders,
    });  }

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
