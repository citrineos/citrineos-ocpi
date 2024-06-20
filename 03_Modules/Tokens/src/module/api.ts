// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Body, Get, HeaderParam, JsonController, Param, Patch, Put } from 'routing-controllers';
import { Service } from 'typedi';

import { HttpStatus } from '@citrineos/base';
import {
  AsOcpiFunctionalEndpoint,
  BaseController,
  EnumQueryParam,
  generateMockOcpiResponse, InvalidParamException,
  ModuleId,
  OcpiEmptyResponse,
  OcpiHttpHeader,
  OcpiResponseStatusCode,
  ResponseSchema,
  SingleTokenRequest,
  Token,
  TokenResponse,
  TokenType,
  UnknownTokenException,
  versionIdParam, WrongClientAccessException,
  TokenDTO, CancelReservation,
} from '@citrineos/ocpi-base';
import { TokensService } from './service';
import { ITokensModuleApi } from './interface';
import { plainToInstance } from 'class-transformer';



@JsonController(`/:${versionIdParam}/${ModuleId.Tokens}`)
@Service()
export class TokensModuleApi
  extends BaseController
  implements ITokensModuleApi {
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
    @HeaderParam(OcpiHttpHeader.OcpiFromPartyId) fromPartyId: string,
    @HeaderParam(OcpiHttpHeader.OcpiFromCountryCode) fromCountryCode: string,
    @EnumQueryParam('type', TokenType, 'TokenType') type?: TokenType,
  ): Promise<TokenResponse | OcpiEmptyResponse> {
    console.log('getTokens', countryCode, partyId, tokenId, type);
    if(fromCountryCode !== countryCode || fromPartyId !== partyId) {
      throw new WrongClientAccessException('Client is trying to access wrong resource');
    }
    const tokenRequest = SingleTokenRequest.build(countryCode, partyId, tokenId, type);
    const token = await this.tokensService.getSingleToken(tokenRequest);
    if (token === undefined) {
      //throw here so that 2004 is returned for unknown token
      throw new UnknownTokenException('Token not found in the database');
    }
    return TokenResponse.build(OcpiResponseStatusCode.GenericSuccessCode, token.toTokenDTO());
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
    @HeaderParam(OcpiHttpHeader.OcpiFromPartyId) fromPartyId: string,
    @HeaderParam(OcpiHttpHeader.OcpiFromCountryCode) fromCountryCode: string,
    @Body() tokenDTO: TokenDTO,
    @EnumQueryParam('type', TokenType, 'TokenType') type?: TokenType,
  ): Promise<OcpiEmptyResponse> {
    console.log('putToken', countryCode, partyId, tokenId, tokenDTO, type);
    //TODO When a client pushes a Client Owned Object, but the {object-id} in the URL is different from the id in the object being pushed, server implementations are advised to return an OCPI status code: 2001.
    if(fromCountryCode !== countryCode || fromPartyId !== partyId) {
      throw new WrongClientAccessException('Client is trying to access wrong resource');
    }
    if(tokenId !== tokenDTO.uid) {
      throw new InvalidParamException('Path token_uid and body token_uid must match');
    }
    const _token = plainToInstance(Token, tokenDTO);
    _token.type = type ? type : TokenType.RFID;
    //TODO save Token
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
    @HeaderParam(OcpiHttpHeader.OcpiFromPartyId) fromPartyId: string,
    @HeaderParam(OcpiHttpHeader.OcpiFromCountryCode) fromCountryCode: string,
    @Body() token: Token,
    @EnumQueryParam('type', TokenType, 'TokenType') type?: TokenType,
  ): Promise<OcpiEmptyResponse> {
    console.log('patchToken', countryCode, partyId, tokenId, token, type);
    //TODO When a client pushes a Client Owned Object, but the {object-id} in the URL is different from the id in the object being pushed, server implementations are advised to return an OCPI status code: 2001.
    if(fromCountryCode !== countryCode || fromPartyId !== partyId) {
      throw new WrongClientAccessException('Client is trying to access wrong resource');
    }
    if(tokenId !== token.uid) {
      throw new InvalidParamException('Path token_uid and body token_uid must match');
    }

    await this.tokensService.updateToken(token);
    return OcpiEmptyResponse.build(OcpiResponseStatusCode.GenericSuccessCode);
  }

}
