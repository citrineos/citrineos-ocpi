// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { ITariffsModuleApi } from './ITariffsModuleApi.js';
import {
  Ctx,
  Delete,
  Get,
  JsonController,
  Param,
  Put,
} from 'routing-controllers';
import { HttpStatus } from '@citrineos/base';
import type {
  OcpiEmptyResponse,
  PaginatedTariffResponse,
  PutTariffRequest,
  TariffDTO,
} from '@citrineos/ocpi-base';
import {
  AsOcpiFunctionalEndpoint,
  BaseController,
  BodyWithSchema,
  buildOcpiEmptyResponse,
  buildOcpiResponse,
  DEFAULT_LIMIT,
  DEFAULT_OFFSET,
  FunctionalEndpointParams,
  generateMockForSchema,
  ModuleId,
  NotFoundException,
  OcpiHeaders,
  OcpiResponseStatusCode,
  Paginated,
  PaginatedParams,
  PaginatedTariffResponseSchema,
  PaginatedTariffResponseSchemaName,
  PutTariffRequestSchema,
  PutTariffRequestSchemaName,
  ResponseSchema,
  TariffsService,
  TariffsBroadcaster,
  versionIdParam,
  VersionNumber,
  VersionNumberParam,
} from '@citrineos/ocpi-base';
import { Service } from 'typedi';

const MOCK_PAGINATED_TARIFF = await generateMockForSchema(
  PaginatedTariffResponseSchema,
  PaginatedTariffResponseSchemaName,
);

@Service()
@JsonController(`/:${versionIdParam}/${ModuleId.Tariffs}`)
export class TariffsModuleApi
  extends BaseController
  implements ITariffsModuleApi
{
  constructor(
    readonly tariffService: TariffsService,
    readonly tariffsBroadcaster: TariffsBroadcaster,
  ) {
    super();
  }

  /**
   * Sender Interface: GET /tariffs (paginated list)
   */
  @Get()
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(
    PaginatedTariffResponseSchema,
    PaginatedTariffResponseSchemaName,
    {
      statusCode: HttpStatus.OK,
      description: 'Successful response',
      examples: {
        success: MOCK_PAGINATED_TARIFF,
      },
    },
  )
  async getTariffs(
    @VersionNumberParam() version: VersionNumber,
    @FunctionalEndpointParams() ocpiHeaders: OcpiHeaders,
    @Paginated() paginationParams?: PaginatedParams,
  ): Promise<PaginatedTariffResponse> {
    const { data, count } = await this.tariffService.getTariffs(
      ocpiHeaders,
      paginationParams,
    );

    return {
      data: data,
      total: count,
      offset: paginationParams?.offset || DEFAULT_OFFSET,
      limit: paginationParams?.limit || DEFAULT_LIMIT,
      status_code: OcpiResponseStatusCode.GenericSuccessCode,
      timestamp: new Date(),
    };
  }

  /**
   * Receiver Interface: GET /:country_code/:party_id/:tariff_id
   */
  @Get('/:country_code/:party_id/:tariff_id')
  @AsOcpiFunctionalEndpoint()
  async getTariffById(
    @VersionNumberParam() version: VersionNumber,
    @Param('country_code') countryCode: string,
    @Param('party_id') partyId: string,
    @Param('tariff_id') tariffId: string,
  ) {
    const tariff = await this.tariffService.getTariffByOcpiId(
      countryCode,
      partyId,
      tariffId,
    );

    if (!tariff) {
      throw new NotFoundException(
        `Tariff ${tariffId} not found for ${countryCode}/${partyId}`,
      );
    }

    return buildOcpiResponse<TariffDTO>(
      OcpiResponseStatusCode.GenericSuccessCode,
      tariff,
    );
  }

  /**
   * Receiver Interface: PUT /:country_code/:party_id/:tariff_id
   */
  @Put('/:country_code/:party_id/:tariff_id')
  @AsOcpiFunctionalEndpoint()
  async putTariff(
    @VersionNumberParam() version: VersionNumber,
    @Param('country_code') countryCode: string,
    @Param('party_id') partyId: string,
    @Param('tariff_id') tariffId: string,
    @BodyWithSchema(PutTariffRequestSchema, PutTariffRequestSchemaName)
    tariffBody: PutTariffRequest,
    @Ctx() ctx?: any,
  ) {
    const tenantId: number | undefined = ctx?.state?.tenantPartner?.tenant?.id;
    const tariffRequest: PutTariffRequest = {
      ...tariffBody,
      id: tariffId,
      country_code: countryCode,
      party_id: partyId,
    };
    const result = await this.tariffService.createOrUpdateTariff(
      tariffRequest,
      tenantId,
    );

    return buildOcpiResponse<TariffDTO>(
      OcpiResponseStatusCode.GenericSuccessCode,
      result,
    );
  }

  /**
   * Receiver Interface: DELETE /:country_code/:party_id/:tariff_id
   */
  @Delete('/:country_code/:party_id/:tariff_id')
  @AsOcpiFunctionalEndpoint()
  async deleteTariff(
    @VersionNumberParam() version: VersionNumber,
    @Param('country_code') countryCode: string,
    @Param('party_id') partyId: string,
    @Param('tariff_id') tariffId: string,
  ): Promise<OcpiEmptyResponse> {
    await this.tariffService.deleteTariff(countryCode, partyId, tariffId);
    return buildOcpiEmptyResponse(OcpiResponseStatusCode.GenericSuccessCode);
  }
}
