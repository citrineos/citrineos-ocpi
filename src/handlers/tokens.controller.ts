import {Controller, Get, Param, Post} from 'routing-controllers';
import {OcpiModules} from '../trigger/BaseApi';
import {Service} from 'typedi';
import {BaseController} from './base.controller';
import {AsOcpiFunctionalEndpoint} from '../util/decorators/as.ocpi.functional.endpoint';
import {ResponseSchema} from '../openapi-spec-helper';
import {HttpStatus} from '@citrineos/base';
import {PaginatedParams} from '../trigger/param/paginated.params';
import {PaginatedTokenResponse} from '../model/Token';
import {Paginated} from '../util/decorators/paginated';
import {AuthorizationInfo} from '../model/AuthorizationInfo';
import {TokenType} from '../model/TokenType';
import {EnumQueryParam} from '../util/decorators/enum.query.param';

@Controller(`/${OcpiModules.Tokens}`)
@Service()
export class TokensController extends BaseController {

  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(PaginatedTokenResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getTokens(
    @Paginated() paginationParams?: PaginatedParams,
  ): Promise<PaginatedTokenResponse> {
    console.log('getTokens', paginationParams);
    return await this.generateMockOcpiPaginatedResponse(PaginatedTokenResponse, paginationParams);
  }

  @Post('/:tokenId/authorize')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(AuthorizationInfo, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async postToken(
    @Param('tokenId') tokenId: string,
    @EnumQueryParam('type', TokenType, 'TokenType') type?: TokenType
  ): Promise<AuthorizationInfo> {
    console.log('postTariffs', tokenId, type);
    return this.generateMockOcpiResponse(AuthorizationInfo);
  }
}
