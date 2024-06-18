// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0


import {Body, Controller, Get, Param, Patch, Put} from 'routing-controllers';
import {Service} from 'typedi';


import {HttpStatus} from '@citrineos/base';
import {
    AsOcpiFunctionalEndpoint,
    BaseController,
    EnumQueryParam,
    generateMockOcpiResponse,
    ModuleId,
    OcpiEmptyResponse,
    ResponseSchema,
    Token,
    TokenResponse,
    TokenType
} from '@citrineos/ocpi-base';
import {TokensService} from "./service";
import {ITokensModuleApi} from "./interface";




@Controller(`/${ModuleId.Tokens}`)
@Service()
export class TokensModuleApi extends BaseController implements ITokensModuleApi {

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
        @EnumQueryParam('type', TokenType, 'TokenType') type?: TokenType,
    ): Promise<TokenResponse> {
        console.log('getTokens', countryCode, partyId, tokenId, type);
        //TODO validate caller owns token
        return new TokenResponse();
        // return this.generateMockOcpiResponse(TokenResponse);
    }

    @Put('/:countryCode/:partyId/:tokenId')
    @AsOcpiFunctionalEndpoint()
    @ResponseSchema(OcpiEmptyResponse, {
        statusCode: HttpStatus.OK,
        description: 'Successful response',
        examples: {
            // success: generateMockOcpiResponse(OcpiEmptyResponse),
        },
    })
    async putToken(
        @Param('countryCode') countryCode: string,
        @Param('partyId') partyId: string,
        @Param('tokenId') tokenId: string,
        @Body() token: Token,
        @EnumQueryParam('type', TokenType, 'TokenType') type?: TokenType,
    ): Promise<OcpiEmptyResponse> {
        console.log('putToken', countryCode, partyId, tokenId, token, type);
        return new OcpiEmptyResponse();
        // return generateMockOcpiResponse(OcpiEmptyResponse);
    }

    @Patch('/:countryCode/:partyId/:tokenId')
    @AsOcpiFunctionalEndpoint()
    @ResponseSchema(OcpiEmptyResponse, {
        statusCode: HttpStatus.OK,
        description: 'Successful response',
        examples: {
            // success: generateMockOcpiResponse(OcpiEmptyResponse),
        },
    })
    async patchToken(
        @Param('countryCode') countryCode: string,
        @Param('partyId') partyId: string,
        @Param('tokenId') tokenId: string,
        @Body() token: Token,
        @EnumQueryParam('type', TokenType, 'TokenType') type?: TokenType,
    ): Promise<OcpiEmptyResponse> {
        console.log('patchToken', countryCode, partyId, tokenId, token, type);
        return new OcpiEmptyResponse();
        // return generateMockOcpiResponse(OcpiEmptyResponse);
    }
}
