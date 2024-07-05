// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  Body,
  Get,
  JsonController,
  Param,
  Patch,
  Put,
  Post,
} from 'routing-controllers';
import { Service } from 'typedi';

import { HttpStatus } from '@citrineos/base';
import {
  AsOcpiFunctionalEndpoint,
  AsyncJobStatusDTO,
  BaseController,
  EnumQueryParam,
  generateMockOcpiResponse,
  InvalidParamException,
  ModuleId,
  OcpiEmptyResponse,
  OcpiHeaders,
  OcpiResponseStatusCode,
  ResponseSchema,
  SingleTokenRequest,
  OCPIToken,
  TokenDTO,
  TokenResponse,
  TokensService,
  TokenType,
  UnknownTokenException,
  versionIdParam,
  WrongClientAccessException,
  FunctionalEndpointParams,
  Paginated,
  PaginatedParams,
} from '@citrineos/ocpi-base';
import { ITokensModuleApi } from './interface';
import { plainToInstance } from 'class-transformer';
import { NotFoundError } from 'routing-controllers';

@JsonController(`/:${versionIdParam}/${ModuleId.Tokens}`)
@Service()
export class TokensModuleApi
  extends BaseController
  implements ITokensModuleApi
{
  constructor(readonly tokensService: TokensService) {
    super();
  }

  @Get('/:countryCode/:partyId/:tokenId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(TokenResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(TokenResponse),
    },
  })
  async getTokens(
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('tokenId') tokenId: string,
    @FunctionalEndpointParams() ocpiHeader: OcpiHeaders,
    @EnumQueryParam('type', TokenType, 'TokenType') type?: TokenType,
  ): Promise<TokenResponse | OcpiEmptyResponse> {
    console.log('getTokens', countryCode, partyId, tokenId, type);
    if (
      ocpiHeader.fromCountryCode !== countryCode ||
      ocpiHeader.fromPartyId !== partyId
    ) {
      throw new WrongClientAccessException(
        'Client is trying to access wrong resource',
      );
    }
    const tokenRequest = SingleTokenRequest.build(
      countryCode,
      partyId,
      tokenId,
      type,
    );
    const token = await this.tokensService.getSingleToken(tokenRequest);
    if (token === undefined) {
      // throw here so that 2004 is returned for unknown token
      throw new UnknownTokenException('Token not found in the database');
    }
    return TokenResponse.build(
      OcpiResponseStatusCode.GenericSuccessCode,
      token.toTokenDTO(),
    );
  }

  @Put('/:countryCode/:partyId/:tokenId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(OcpiEmptyResponse),
    },
  })
  async putToken(
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('tokenId') tokenId: string,
    @FunctionalEndpointParams() ocpiHeader: OcpiHeaders,
    @Body() tokenDTO: TokenDTO,
    @EnumQueryParam('type', TokenType, 'TokenType') type?: TokenType,
  ): Promise<OcpiEmptyResponse> {
    console.log('putToken', countryCode, partyId, tokenId, tokenDTO, type);
    // TODO When a client pushes a Client Owned Object, but the {object-id} in the URL is different from the id in the object being pushed, server implementations are advised to return an OCPI status code: 2001.
    if (
      ocpiHeader.fromCountryCode !== countryCode ||
      ocpiHeader.fromPartyId !== partyId
    ) {
      throw new WrongClientAccessException(
        'Client is trying to access wrong resource',
      );
    }
    if (tokenId !== tokenDTO.uid) {
      throw new InvalidParamException(
        'Path token_uid and body token_uid must match',
      );
    }
    const _token = plainToInstance(OCPIToken, tokenDTO);
    _token.type = type ? type : TokenType.RFID;
    // TODO save Token
    await this.tokensService.saveToken(_token);
    return OcpiEmptyResponse.build(OcpiResponseStatusCode.GenericSuccessCode);
  }

  @Patch('/:countryCode/:partyId/:tokenId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(OcpiEmptyResponse),
    },
  })
  async patchToken(
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('tokenId') tokenId: string,
    @FunctionalEndpointParams() ocpiHeader: OcpiHeaders,
    @Body() token: Partial<TokenDTO>,
    @EnumQueryParam('type', TokenType, 'TokenType') type?: TokenType,
  ): Promise<OcpiEmptyResponse> {
    console.log('patchToken', countryCode, partyId, tokenId, token, type);
    // TODO When a client pushes a Client Owned Object, but the {object-id} in the URL is different from the id in the object being pushed, server implementations are advised to return an OCPI status code: 2001.
    if (
      ocpiHeader.fromCountryCode !== countryCode ||
      ocpiHeader.fromPartyId !== partyId
    ) {
      throw new WrongClientAccessException(
        'Client is trying to access wrong resource',
      );
    }

    if (token.party_id && partyId !== token.party_id) {
      throw new InvalidParamException(
        'Path party_id and body party_id must match',
      );
    } else {
      token.party_id = partyId;
    }

    if (token.country_code && countryCode !== token.country_code) {
      throw new InvalidParamException(
        'Path country_code and body country_code must match',
      );
    } else {
      token.country_code = countryCode;
    }

    if (token.uid && tokenId !== token.uid) {
      throw new InvalidParamException(
        'Path token_uid and body token_uid must match',
      );
    } else {
      token.uid = tokenId;
    }
    const _token = OCPIToken.build(token);
    _token.type = type ? type : TokenType.RFID;

    await this.tokensService.updateToken(_token);
    return OcpiEmptyResponse.build(OcpiResponseStatusCode.GenericSuccessCode);
  }

  /**
   * Admin Endpoints
   **/

  @Post('/:countryCode/:partyId/fetch')
  @ResponseSchema(AsyncJobStatusDTO, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(AsyncJobStatusDTO),
    },
  })
  async fetchTokens(
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Paginated() paginationParams?: PaginatedParams,
  ): Promise<AsyncJobStatusDTO> {
    console.log('fetchTokens', countryCode, partyId, paginationParams);
    const jobStatus = await this.tokensService.startFetchTokensByParty(
      countryCode,
      partyId,
      paginationParams,
    );
    return jobStatus.toDTO();
  }

  @Get('/:countryCode/:partyId/fetch/:jobId')
  @ResponseSchema(AsyncJobStatusDTO, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(AsyncJobStatusDTO),
    },
  })
  async getFetchTokensJobStatus(
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('jobId') jobId: string,
  ): Promise<AsyncJobStatusDTO> {
    console.log('fetchTokens', countryCode, partyId, jobId);
    const jobStatus = await this.tokensService.getFetchTokensJob(jobId);
    if (!jobStatus) {
      throw new NotFoundError('Job not found');
    }
    return jobStatus.toDTO();
  }
}
