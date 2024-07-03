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
  generateMockOcpiPaginatedResponse,
  ModuleId,
  Paginated,
  PaginatedOcpiParams,
  PaginatedParams,
  ResponseSchema,
  SessionsService,
} from '@citrineos/ocpi-base';

import { Service } from 'typedi';
import { PaginatedCdrResponse } from '@citrineos/ocpi-base/dist/model/Cdr';

const MOCK_PAGINATED_CDRS = generateMockOcpiPaginatedResponse(
  PaginatedCdrResponse,
  new PaginatedParams(),
);

@JsonController(`/${ModuleId.Cdrs}`)
@Service()
export class CdrsModuleApi
  extends BaseController
  implements ICdrsModuleApi {
  constructor(readonly sessionsService: SessionsService) {
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
    @Paginated() paginationParams?: PaginatedOcpiParams,
  ): Promise<PaginatedCdrResponse> {
    console.info(
      paginationParams?.date_from,
      paginationParams?.fromCountryCode,
      paginationParams?.fromPartyId,
      paginationParams?.toCountryCode,
      paginationParams?.toPartyId,
    );
    return new PaginatedCdrResponse();
  }
}
