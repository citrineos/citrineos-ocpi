// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  Body,
  Get,
  JsonController,
  NotFoundError,
  Param,
  Patch,
  Post,
  Put,
  QueryParam,
  BadRequestError,
  Delete,
} from 'routing-controllers';
import { Service } from 'typedi';

import { HttpStatus } from '@citrineos/base';
import {
  AsOcpiFunctionalEndpoint,
  AsyncJobAction,
  AsyncJobStatusDTO,
  BaseController,
  BodyWithExample,
  EnumQueryParam,
  FunctionalEndpointParams,
  generateMockOcpiResponse,
  InvalidParamException,
  ModuleId,
  OcpiEmptyResponse,
  OcpiHeaders,
  OcpiResponseStatusCode,
  ResponseSchema,
  SingleTokenRequest,
  TokenDTO,
  TokenResponse,
  TokensService,
  TokensAdminService,
  TokenType,
  UnknownTokenException,
  versionIdParam,
  VersionNumber,
  VersionNumberParam,
  WhitelistType,
  WrongClientAccessException,
  AsyncJobRequest,
} from '@citrineos/ocpi-base';
import { ITokensModuleApi } from './interface';

const MockPutTokenBody = {
  country_code: 'MSP',
  party_id: 'US',
  uid: 'SOMEUID',
  type: 'RFID',
  contract_id: 'contract_id',
  issuer: 'issuer',
  valid: true,
  whitelist: WhitelistType.ALLOWED,
  last_updated: '2024-07-10T18:00:40.087Z',
  visual_number: 'visual_number',
  group_id: 'group_id',
  language: 'language',
  default_profile_type: 'default_profile_type',
  energy_contract: {
    supplier_name: 'supplier_name',
    contract_id: 'contract_id',
  },
};

@JsonController(`/:${versionIdParam}/${ModuleId.Tokens}`)
@Service()
export class TokensModuleApi
  extends BaseController
  implements ITokensModuleApi
{
  constructor(
    readonly tokensService: TokensService,
    readonly tokensFetchService: TokensAdminService,
  ) {
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
    @VersionNumberParam() version: VersionNumber,
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
      type ?? TokenType.RFID,
    );

    const token = await this.tokensService.getSingleToken(tokenRequest);

    if (token === undefined) {
      throw new UnknownTokenException('Token not found in the database');
    }

    return TokenResponse.build(
      OcpiResponseStatusCode.GenericSuccessCode,
      token,
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
    @VersionNumberParam() version: VersionNumber,
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('tokenId') tokenId: string,
    @FunctionalEndpointParams() ocpiHeader: OcpiHeaders,
    @BodyWithExample(MockPutTokenBody) tokenDTO: TokenDTO,
    @EnumQueryParam('type', TokenType, 'TokenType') type?: TokenType,
  ): Promise<OcpiEmptyResponse> {
    console.log('putToken', countryCode, partyId, tokenId, tokenDTO, type);
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
    await this.tokensService.saveToken(tokenDTO);

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
    @VersionNumberParam() version: VersionNumber,
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('tokenId') tokenId: string,
    @FunctionalEndpointParams() ocpiHeader: OcpiHeaders,
    @Body() token: TokenDTO,
    @EnumQueryParam('type', TokenType, 'TokenType') type?: TokenType,
  ): Promise<OcpiEmptyResponse> {
    console.log('patchToken', countryCode, partyId, tokenId, token, type);
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
    token.type = type ?? TokenType.RFID;

    await this.tokensService.updateToken(token);

    return OcpiEmptyResponse.build(OcpiResponseStatusCode.GenericSuccessCode);
  }

  /**
   * Admin Endpoints
   **/
  @Post('/fetch')
  @ResponseSchema(AsyncJobStatusDTO, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(AsyncJobStatusDTO),
    },
  })
  async fetchTokens(
    @VersionNumberParam() version: VersionNumber,
    @Body() asyncJobRequest: AsyncJobRequest,
  ): Promise<AsyncJobStatusDTO> {
    const jobStatus =
      await this.tokensFetchService.startFetchTokensByParty(asyncJobRequest);
    return jobStatus.toDTO();
  }
  @Post('/fetch/:jobId/:action')
  @ResponseSchema(AsyncJobStatusDTO, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(AsyncJobStatusDTO),
    },
  })
  async fetchTokensAction(
    @VersionNumberParam() version: VersionNumber,
    @Param('jobId') jobId: string,
    @Param('action') action: AsyncJobAction,
  ): Promise<AsyncJobStatusDTO> {
    switch (action) {
      case AsyncJobAction.RESUME:
        return (await this.tokensFetchService.resumeFetchTokens(jobId)).toDTO();
      case AsyncJobAction.STOP:
        return (await this.tokensFetchService.stopFetchTokens(jobId)).toDTO();
      default:
        throw new BadRequestError('Action not found');
    }
  }
  @Get('/fetch/:jobId')
  @ResponseSchema(AsyncJobStatusDTO, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(AsyncJobStatusDTO),
    },
  })
  async getFetchTokensJobStatus(
    @VersionNumberParam() version: VersionNumber,
    @Param('jobId') jobId: string,
  ): Promise<AsyncJobStatusDTO> {
    const jobStatus = await this.tokensFetchService.getFetchTokensJob(jobId);
    if (!jobStatus) {
      throw new NotFoundError('Job not found');
    }
    return jobStatus.toDTO();
  }

  @Get('/fetch')
  @ResponseSchema(AsyncJobStatusDTO, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(AsyncJobStatusDTO),
    },
  })
  async getActiveFetchTokensJobStatus(
    @VersionNumberParam() version: VersionNumber,
    @QueryParam('mspCountryCode') mspCountryCode: string,
    @QueryParam('mspPartyId') mspPartyId: string,
    @QueryParam('cpoCountryCode') cpoCountryCode: string,
    @QueryParam('cpoPartyId') cpoPartyId: string,
    @QueryParam('active', { required: false }) active: boolean,
  ): Promise<AsyncJobStatusDTO[]> {
    return (
      await this.tokensFetchService.getFetchTokensJobs(
        mspCountryCode,
        mspPartyId,
        cpoCountryCode,
        cpoPartyId,
        active,
      )
    ).map((job) => job.toDTO());
  }

  @Delete('/fetch/:jobId')
  @ResponseSchema(AsyncJobStatusDTO, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(AsyncJobStatusDTO),
    },
  })
  async deleteFetchTokensJobStatus(
    @VersionNumberParam() version: VersionNumber,
    @Param('jobId') jobId: string,
  ): Promise<AsyncJobStatusDTO> {
    const jobStatus = await this.tokensFetchService.deleteFetchTokensJob(jobId);
    if (!jobStatus) {
      throw new NotFoundError('Job not found');
    }
    return jobStatus.toDTO();
  }
}
