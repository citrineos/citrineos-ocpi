// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import {
  Body,
  Ctx,
  Get,
  JsonController,
  Param,
  Patch,
  Post,
  Put,
} from 'routing-controllers';
import { Service } from 'typedi';

import { HttpStatus } from '@citrineos/base';
import type {
  RealTimeAuthorizationRequestBody,
  RealTimeAuthorizationResponse,
} from '@citrineos/util';
import type {
  AuthorizationInfoResponse,
  LocationReferences,
  OcpiEmptyResponse,
  PaginatedTokenResponse,
  SingleTokenRequest,
  TokenDTO,
  TokenResponse,
} from '@citrineos/ocpi-base';
import {
  AsAdminEndpoint,
  AsOcpiFunctionalEndpoint,
  AuthorizationInfoResponseSchema,
  AuthorizationInfoResponseSchemaName,
  BaseController,
  BodyWithExample,
  BodyWithSchema,
  buildOcpiEmptyResponse,
  buildOcpiResponse,
  DEFAULT_LIMIT,
  DEFAULT_OFFSET,
  EnumQueryParam,
  FunctionalEndpointParams,
  generateMockForSchema,
  InvalidParamException,
  LocationReferencesSchema,
  LocationReferencesSchemaName,
  ModuleId,
  OcpiEmptyResponseSchema,
  OcpiEmptyResponseSchemaName,
  OcpiHeaders,
  OcpiResponseStatusCode,
  Paginated,
  PaginatedParams,
  PaginatedTokenResponseSchema,
  PaginatedTokenResponseSchemaName,
  ResponseSchema,
  TokenDTOSchema,
  TokenDTOSchemaName,
  TokenResponseSchema,
  TokenResponseSchemaName,
  TokensService,
  TokenType,
  TokenTypeSchema,
  TokenTypeSchemaName,
  UnknownTokenException,
  versionIdParam,
  VersionNumber,
  VersionNumberParam,
  WhitelistType,
  WrongClientAccessException,
} from '@citrineos/ocpi-base';
import type { ITokensModuleApi } from './ITokensModuleApi.js';

const MOCK_TOKEN_RESPONSE = await generateMockForSchema(
  TokenResponseSchema,
  TokenResponseSchemaName,
);
const MOCK_EMPTY_RESPONSE = await generateMockForSchema(
  OcpiEmptyResponseSchema,
  OcpiEmptyResponseSchemaName,
);
const MOCK_PAGINATED_TOKEN = await generateMockForSchema(
  PaginatedTokenResponseSchema,
  PaginatedTokenResponseSchemaName,
);
const MOCK_AUTH_INFO_RESPONSE = await generateMockForSchema(
  AuthorizationInfoResponseSchema,
  AuthorizationInfoResponseSchemaName,
);

const _MockPutTokenBody = {
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
    // readonly tokensFetchService: TokensAdminService,
  ) {
    super();
  }

  /**
   * Sender Interface: GET /tokens (paginated list)
   */
  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(
    PaginatedTokenResponseSchema,
    PaginatedTokenResponseSchemaName,
    {
      statusCode: HttpStatus.OK,
      description: 'Successful response',
      examples: {
        success: MOCK_PAGINATED_TOKEN,
      },
    },
  )
  async getTokensPaginated(
    @VersionNumberParam() version: VersionNumber,
    @FunctionalEndpointParams() ocpiHeaders: OcpiHeaders,
    @Paginated() paginationParams?: PaginatedParams,
  ): Promise<PaginatedTokenResponse> {
    this.logger.info('getTokensPaginated');
    const { data, count } = await this.tokensService.getTokensPaginated(
      ocpiHeaders,
      paginationParams,
    );

    return {
      data,
      total: count,
      offset: paginationParams?.offset || DEFAULT_OFFSET,
      limit: paginationParams?.limit || DEFAULT_LIMIT,
      status_code: OcpiResponseStatusCode.GenericSuccessCode,
      timestamp: new Date(),
    };
  }

  /**
   * Receiver Interface: GET /:countryCode/:partyId/:tokenId
   */
  @Get('/:countryCode/:partyId/:tokenId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(TokenResponseSchema, TokenResponseSchemaName, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_TOKEN_RESPONSE,
    },
  })
  async getTokens(
    @VersionNumberParam() version: VersionNumber,
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('tokenId') tokenId: string,
    @FunctionalEndpointParams() ocpiHeader: OcpiHeaders,
    @EnumQueryParam('type', TokenTypeSchema, TokenTypeSchemaName)
    type?: TokenType,
  ): Promise<TokenResponse | OcpiEmptyResponse> {
    this.logger.info('getTokens', countryCode, partyId, tokenId, type);
    if (
      ocpiHeader.fromCountryCode !== countryCode ||
      ocpiHeader.fromPartyId !== partyId
    ) {
      throw new WrongClientAccessException(
        'Client is trying to access wrong resource',
      );
    }
    const tokenRequest: SingleTokenRequest = {
      country_code: countryCode,
      party_id: partyId,
      uid: tokenId,
      type: type ?? TokenType.RFID,
    };

    const token = await this.tokensService.getToken(tokenRequest);

    if (token === undefined) {
      throw new UnknownTokenException('Token not found in the database');
    }

    return buildOcpiResponse(OcpiResponseStatusCode.GenericSuccessCode, token);
  }

  @Put('/:countryCode/:partyId/:tokenId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiEmptyResponseSchema, OcpiEmptyResponseSchemaName, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_EMPTY_RESPONSE,
    },
  })
  async putToken(
    @VersionNumberParam() version: VersionNumber,
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('tokenId') tokenId: string,
    @FunctionalEndpointParams() ocpiHeader: OcpiHeaders,
    @BodyWithExample(TokenDTOSchema, TokenTypeSchemaName) tokenDTO: TokenDTO,
    @EnumQueryParam('type', TokenTypeSchema, TokenTypeSchemaName)
    type?: TokenType,
    @Ctx() ctx?: any,
  ): Promise<OcpiEmptyResponse> {
    this.logger.info('putToken', countryCode, partyId, tokenId, tokenDTO, type);

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

    const tenantId = ctx?.state?.tenantPartner?.tenant?.id;
    const tenantPartnerId = ctx?.state?.tenantPartner?.id;

    if (tenantId === undefined || tenantPartnerId === undefined) {
      throw new InvalidParamException('Tenant information not available');
    }

    await this.tokensService.upsertToken(tokenDTO, tenantId, tenantPartnerId);

    return buildOcpiEmptyResponse(OcpiResponseStatusCode.GenericSuccessCode);
  }

  @Patch('/:countryCode/:partyId/:tokenUid')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(OcpiEmptyResponseSchema, OcpiEmptyResponseSchemaName, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_EMPTY_RESPONSE,
    },
  })
  async patchToken(
    @VersionNumberParam() version: VersionNumber,
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('tokenUid') tokenUid: string,
    @FunctionalEndpointParams() ocpiHeader: OcpiHeaders,
    @BodyWithSchema(TokenDTOSchema, TokenDTOSchemaName)
    token: Partial<TokenDTO>,
    @EnumQueryParam('type', TokenTypeSchema, TokenTypeSchemaName)
    type?: TokenType,
    @Ctx() ctx?: any,
  ): Promise<OcpiEmptyResponse> {
    this.logger.info('patchToken', countryCode, partyId, tokenUid, token, type);
    if (
      ocpiHeader.fromCountryCode !== countryCode ||
      ocpiHeader.fromPartyId !== partyId
    ) {
      throw new WrongClientAccessException(
        'Client is trying to access wrong resource',
      );
    }

    const tenantId = ctx?.state?.tenantPartner?.tenant?.id;
    const tenantPartnerId = ctx?.state?.tenantPartner?.id;

    if (tenantId === undefined || tenantPartnerId === undefined) {
      throw new InvalidParamException('Tenant information not available');
    }

    await this.tokensService.patchToken(
      tokenUid,
      type ?? TokenType.RFID,
      token,
      tenantId,
      tenantPartnerId,
    );

    return buildOcpiEmptyResponse(OcpiResponseStatusCode.GenericSuccessCode);
  }

  /**
   * Sender Interface: POST /:tokenUid/authorize (real-time authorization)
   */
  @Post('/:tokenUid/authorize')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(
    AuthorizationInfoResponseSchema,
    AuthorizationInfoResponseSchemaName,
    {
      statusCode: HttpStatus.OK,
      description: 'Successful authorization response',
      examples: {
        success: MOCK_AUTH_INFO_RESPONSE,
      },
    },
  )
  async postAuthorize(
    @VersionNumberParam() version: VersionNumber,
    @Param('tokenUid') tokenUid: string,
    @FunctionalEndpointParams() ocpiHeaders: OcpiHeaders,
    @EnumQueryParam('type', TokenTypeSchema, TokenTypeSchemaName)
    type?: TokenType,
    @BodyWithSchema(LocationReferencesSchema, LocationReferencesSchemaName)
    locationReferences?: LocationReferences,
    @Ctx() ctx?: any,
  ): Promise<AuthorizationInfoResponse> {
    this.logger.info('postAuthorize', tokenUid, type);

    const tenantPartnerId = ctx?.state?.tenantPartner?.id;
    if (tenantPartnerId === undefined) {
      throw new InvalidParamException('Tenant information not available');
    }

    const authInfo = await this.tokensService.authorizeToken(
      tokenUid,
      type ?? TokenType.RFID,
      tenantPartnerId,
      locationReferences,
    );

    return buildOcpiResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      authInfo,
    );
  }

  @Post('/realTimeAuth')
  @AsAdminEndpoint()
  async realTimeAuthorization(
    @VersionNumberParam() _version: VersionNumber,
    @Body() realTimeAuthRequest: RealTimeAuthorizationRequestBody,
  ): Promise<RealTimeAuthorizationResponse> {
    this.logger.info('realTimeAuthorization', realTimeAuthRequest);
    return this.tokensService.realTimeAuthorization(realTimeAuthRequest);
  }

  /**
   * Admin Endpoints
   **/
  // @Post('/fetch')
  // async fetchTokens(
  //   @VersionNumberParam() version: VersionNumber,
  //   @Body(AsyncJobRequestSchema) asyncJobRequest: AsyncJobRequest,
  // ): Promise<AsyncJobStatusResponse> {
  //   const jobStatus =
  //     await this.tokensFetchService.startFetchTokensByParty(asyncJobRequest);
  //   return jobStatus;
  // }

  // @Post('/fetch/:jobId/:action')
  // async fetchTokensAction(
  //   @VersionNumberParam() version: VersionNumber,
  //   @Param('jobId') jobId: string,
  //   @Param('action') action: AsyncJobAction,
  // ): Promise<AsyncJobStatusResponse> {
  //   switch (action) {
  //     case AsyncJobAction.RESUME:
  //       return await this.tokensFetchService.resumeFetchTokens(jobId);
  //     case AsyncJobAction.STOP:
  //       return await this.tokensFetchService.stopFetchTokens(jobId);
  //     default:
  //       throw new BadRequestError('Action not found');
  //   }
  // }

  // @Get('/fetch/:jobId')
  // async getFetchTokensJobStatus(
  //   @VersionNumberParam() version: VersionNumber,
  //   @Param('jobId') jobId: string,
  // ): Promise<AsyncJobStatusResponse> {
  //   const jobStatus = await this.tokensFetchService.getFetchTokensJob(jobId);
  //   if (!jobStatus) {
  //     throw new NotFoundError('Job not found');
  //   }
  //   return jobStatus;
  // }

  // @Get('/fetch')
  // async getActiveFetchTokensJobStatus(
  //   @VersionNumberParam() version: VersionNumber,
  //   @QueryParam('tenantPartnerId') tenantPartnerId: number,
  //   @QueryParam('active', { required: false }) active: boolean,
  // ): Promise<AsyncJobStatusResponse[]> {
  //   return await this.tokensFetchService.getFetchTokensJobs(
  //     tenantPartnerId,
  //     active,
  //   );
  // }

  // @Delete('/fetch/:jobId')
  // async deleteFetchTokensJobStatus(
  //   @VersionNumberParam() version: VersionNumber,
  //   @Param('jobId') jobId: string,
  // ): Promise<AsyncJobStatusResponse> {
  //   const jobStatus = await this.tokensFetchService.deleteFetchTokensJob(jobId);
  //   if (!jobStatus) {
  //     throw new NotFoundError('Job not found');
  //   }
  //   return jobStatus;
  // }
}
