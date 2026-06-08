// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { ICdrsModuleApi } from './ICdrsModuleApi.js';

import { Ctx, Get, JsonController, Param, Post } from 'routing-controllers';
import { HttpStatus } from '@zetra/citrineos-base';
import type {
  RoamingPartnerDto,
  TenantPartnerDto,
} from '@zetra/citrineos-base';
import type {
  OcpiErrorResponse,
  PullPartnerModulesBody,
} from '@citrineos/ocpi-base';

import type {
  PaginatedCdrResponse,
  VersionNumber,
  OcpiEmptyResponse,
  CdrDTO,
} from '@citrineos/ocpi-base';
import {
  AsOcpiFunctionalEndpoint,
  BaseController,
  CdrsService,
  FunctionalEndpointParams,
  generateMockOcpiPaginatedResponse,
  ModuleId,
  OcpiHeaders,
  Paginated,
  PaginatedCdrResponseSchema,
  PaginatedCdrResponseSchemaName,
  PaginatedParams,
  ResponseSchema,
  versionIdParam,
  VersionNumberParam,
  OcpiResponseStatusCode,
  buildOcpiEmptyResponse,
  CdrDTOSchema,
  CdrDTOSchemaName,
  BodyWithSchema,
  PullPartnerModulesBodySchemaName,
  PullPartnerModulesBodySchema,
  AsAdminEndpoint,
  buildOcpiResponse,
} from '@citrineos/ocpi-base';

import { Service } from 'typedi';

const MOCK_PAGINATED_CDRS = await generateMockOcpiPaginatedResponse(
  PaginatedCdrResponseSchema,
  PaginatedCdrResponseSchemaName,
  new PaginatedParams(),
);

@JsonController(`/:role(cpo|emsp)/:${versionIdParam}/${ModuleId.Cdrs}`)
@Service()
export class CdrsModuleApi extends BaseController implements ICdrsModuleApi {
  constructor(readonly cdrsService: CdrsService) {
    super();
  }

  //-- Sender Interface ------------------------------------------------------//

  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(PaginatedCdrResponseSchema, PaginatedCdrResponseSchemaName, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: MOCK_PAGINATED_CDRS,
    },
  })
  async getCdrs(
    @Paginated() paginationParams?: PaginatedParams,
    @FunctionalEndpointParams() ocpiHeaders?: OcpiHeaders,
  ): Promise<PaginatedCdrResponse> {
    return this.cdrsService.getCdrs(
      ocpiHeaders!.fromCountryCode,
      ocpiHeaders!.fromPartyId,
      ocpiHeaders!.toCountryCode,
      ocpiHeaders!.toPartyId,
      paginationParams?.dateFrom,
      paginationParams?.dateTo,
      paginationParams?.offset,
      paginationParams?.limit,
    );
  }

  //-- Receiver Interface (OCPI 2.2.1) ------------//

  @Get('/:cdr_id')
  @AsOcpiFunctionalEndpoint({ skipTenantPartnerUrlValidation: true })
  async getCdrById(@Param('cdr_id') cdrId: number, @Ctx() ctx: any) {
    const tenantPartner = ctx.state.tenantPartner as TenantPartnerDto;
    const roamingPartner = ctx.state.roamingPartner as RoamingPartnerDto;
    return this.cdrsService.getCdrById(cdrId, tenantPartner, roamingPartner);
  }

  @Post('/')
  @AsOcpiFunctionalEndpoint()
  async putConnectorByCountryParty(
    @VersionNumberParam() version: VersionNumber,
    @Ctx() ctx: any,
    @BodyWithSchema(CdrDTOSchema, CdrDTOSchemaName)
    cdr: CdrDTO,
  ): Promise<OcpiErrorResponse | OcpiEmptyResponse> {
    this.logger.info(`POST receiver CDR`);
    const tenantPartner = ctx.state.tenantPartner as TenantPartnerDto;

    const cdrId = await this.cdrsService.putCdrForTenantPartner(
      cdr,
      tenantPartner,
    );

    const baseUrl = `${ctx.request.protocol}://${ctx.request.host}`;
    ctx.response.set(
      'Location',
      `${baseUrl}/ocpi/emsp/${version}/cdrs/${cdrId}`,
    );

    return buildOcpiEmptyResponse(OcpiResponseStatusCode.GenericSuccessCode);
  }

  /**
   * ADMIN ENDPOINTS
   */
  @Post('/pull-partner-cdrs')
  @AsAdminEndpoint()
  async PullPartnerCdrs(
    @BodyWithSchema(
      PullPartnerModulesBodySchema,
      PullPartnerModulesBodySchemaName,
    )
    body: PullPartnerModulesBody,
  ) {
    this.logger.info('PullPartnerCdrs', body);

    const summary = await this.cdrsService.pullPartnerCdrs(body);

    return buildOcpiResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      summary,
    );
  }
}
