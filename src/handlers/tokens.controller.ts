import {Body, Get, JsonController, Param, Patch, Put} from 'routing-controllers';
import {Service} from 'typedi';
import {BaseController, generateMockOcpiResponse} from './base.controller';
import {AsOcpiFunctionalEndpoint} from '../util/decorators/as.ocpi.functional.endpoint';
import {ResponseSchema} from '../openapi-spec-helper';
import {HttpStatus} from '@citrineos/base';
import {Token, TokenResponse} from '../model/Token';
import {TokenType} from '../model/TokenType';
import {EnumQueryParam} from '../util/decorators/enum.query.param';
import {ModuleId} from '../model/ModuleId';
import {OcpiEmptyResponse} from '../model/ocpi.empty.response';
import {versionIdParam, VersionNumberParam} from "../util/decorators/version.number.param";
import {VersionNumber} from "../model/VersionNumber";

const MOCK_TOKEN = generateMockOcpiResponse(TokenResponse);
const MOCK_EMPTY = generateMockOcpiResponse(OcpiEmptyResponse);

@JsonController(`/:${versionIdParam}/${ModuleId.Tokens}`)
@Service()
export class TokensController extends BaseController {
  @Get('/:countryCode/:partyId/:tokenId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(TokenResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_TOKEN
      },
    },
  })
  async getTokens(
    @VersionNumberParam() _version: VersionNumber,
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('tokenId') tokenId: string,
    @EnumQueryParam('type', TokenType, 'TokenType') type?: TokenType,
  ): Promise<TokenResponse> {
    console.log('getTokens', countryCode, partyId, tokenId, type);
    return this.generateMockOcpiResponse(TokenResponse);
  }

  @Put('/:countryCode/:partyId/:tokenId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_EMPTY
      },
    },
  })
  async putToken(
    @VersionNumberParam() _version: VersionNumber,
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('tokenId') tokenId: string,
    @Body() token: Token,
    @EnumQueryParam('type', TokenType, 'TokenType') type?: TokenType,
  ): Promise<OcpiEmptyResponse> {
    console.log('putToken', countryCode, partyId, tokenId, token, type);
    return MOCK_EMPTY;
  }

  @Patch('/:countryCode/:partyId/:tokenId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: {
        summary: 'A successful response',
        value: MOCK_EMPTY
      },
    },
  })
  async patchToken(
    @VersionNumberParam() _version: VersionNumber,
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('tokenId') tokenId: string,
    @Body() token: Token,
    @EnumQueryParam('type', TokenType, 'TokenType') type?: TokenType,
  ): Promise<OcpiEmptyResponse> {
    console.log('patchToken', countryCode, partyId, tokenId, token, type);
    return MOCK_EMPTY;
  }
}
