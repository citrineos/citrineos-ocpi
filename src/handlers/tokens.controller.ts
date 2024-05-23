import {Controller, Get, Param, Post} from "routing-controllers";
import {OcpiModules} from "../trigger/BaseApi";
import {Service} from "typedi";
import {BaseController} from "./base.controller";
import {AsOcpiEndpoint} from "../util/decorators/as.ocpi.endpoint";
import {ResponseSchema} from "../openapi-spec-helper";
import {HttpStatus} from "@citrineos/base";
import {PaginatedParams} from "../trigger/param/paginated.params";
import {TokenListResponse} from "../model/Token";
import {Paginated} from "../util/decorators/paginated";
import {AuthorizationInfo} from "../model/AuthorizationInfo";
import {TokenType} from "../model/TokenType";
import {EnumQueryParam} from "../util/decorators/enum.query.param";

@Controller(`/${OcpiModules.Tokens}`)
@Service()
export class TokensController extends BaseController {

  // todo pg 146 https://evroaming.org/app/uploads/2021/11/OCPI-2.2.1.pdf
  // todo This request is paginated, it supports the pagination related URL parameters
  @Get()
  @AsOcpiEndpoint()
  @ResponseSchema(TokenListResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getTokens(
    @Paginated() paginationParams?: PaginatedParams,
  ): Promise<TokenListResponse> {
    console.log('getTokens', paginationParams);
    return this.generateMockOcpiResponse(TokenListResponse);
  }

  @Post('/:tokenId/authorize')
  @AsOcpiEndpoint()
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
