// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ICdrsModuleApi } from './interface';

import { Get, JsonController } from 'routing-controllers';
import { HttpStatus } from '@citrineos/base';
import {
  AsOcpiFunctionalEndpoint,
  BaseController,
  CdrsService,
  FunctionalEndpointParams,
  generateMockOcpiPaginatedResponse,
  ModuleId,
  OcpiHeaders,
  Paginated,
  PaginatedCdrResponse,
  PaginatedParams,
  ResponseSchema,
  versionIdParam,
} from '@citrineos/ocpi-base';

import { Service } from 'typedi';

const MOCK_PAGINATED_CDRS = generateMockOcpiPaginatedResponse(
  PaginatedCdrResponse,
  new PaginatedParams(),
);

@JsonController(`/:${versionIdParam}/${ModuleId.Cdrs}`)
@Service()
export class CdrsModuleApi extends BaseController implements ICdrsModuleApi {
  constructor(readonly cdrsService: CdrsService) {
    super();
  }

  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(PaginatedCdrResponse, {
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
}
