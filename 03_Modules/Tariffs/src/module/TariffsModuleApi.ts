// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { ITariffsModuleApi } from './ITariffsModuleApi.js';
import {
  Ctx,
  Delete,
  Get,
  Post,
  JsonController,
  Param,
  Put,
} from 'routing-controllers';
import { HttpStatus, type TenantPartnerDto } from '@zetra/citrineos-base';
import type {
  OcpiEmptyResponse,
  PaginatedTariffResponse,
  PullPartnerModulesBody,
  PushPartnerModulesBody,
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
  PullPartnerModulesBodySchemaName,
  PullPartnerModulesBodySchema,
  AsAdminEndpoint,
  PushPartnerModulesBodySchemaName,
  PushPartnerModulesBodySchema,
} from '@citrineos/ocpi-base';
import { Service } from 'typedi';

const MOCK_PAGINATED_TARIFF = await generateMockForSchema(
  PaginatedTariffResponseSchema,
  PaginatedTariffResponseSchemaName,
);

@Service()
@JsonController(`/:role(cpo|emsp)/:${versionIdParam}/${ModuleId.Tariffs}`)
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
    @Ctx() ctx?: any,
  ) {
    const tenantPartner: TenantPartnerDto | undefined =
      ctx?.state?.tenantPartner;
    const tariff = await this.tariffService.getTariffByOcpiId(
      countryCode,
      partyId,
      tariffId,
      tenantPartner,
      true,
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
    const tenantPartnerId: number | undefined = ctx?.state?.tenantPartner?.id;
    const tariffRequest: PutTariffRequest = {
      ...tariffBody,
      id: tariffId,
      country_code: countryCode,
      party_id: partyId,
    };
    const result = await this.tariffService.createOrUpdateTariff(
      tariffRequest,
      tenantId,
      tenantPartnerId,
      ctx?.state?.tenantPartner,
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
    @Ctx() ctx?: any,
  ): Promise<OcpiEmptyResponse> {
    const tenantPartner: TenantPartnerDto | undefined =
      ctx?.state?.tenantPartner;
    await this.tariffService.deleteTariff(
      countryCode,
      partyId,
      tariffId,
      true,
      tenantPartner,
    );
    return buildOcpiEmptyResponse(OcpiResponseStatusCode.GenericSuccessCode);
  }

  /**
   * ADMIN ENDPOINTS
   */
  @Post('/pull-partner-tariffs')
  @AsAdminEndpoint()
  async PullPartnerTariffs(
    @BodyWithSchema(
      PullPartnerModulesBodySchema,
      PullPartnerModulesBodySchemaName,
    )
    body: PullPartnerModulesBody,
  ) {
    this.logger.info('PullPartnerTariffs', body);

    const summary = await this.tariffService.pullPartnerTariffs(body);

    return buildOcpiResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      summary,
    );
  }

  @Post('/push-tariffs-to-partner')
  @AsAdminEndpoint()
  async PushTariffsToPartner(
    @BodyWithSchema(
      PushPartnerModulesBodySchema,
      PushPartnerModulesBodySchemaName,
    )
    body: PushPartnerModulesBody,
  ) {
    this.logger.info('PushTariffsToPartner', body);

    const summary = await this.tariffService.pushTariffsToPartner(body);

    return buildOcpiResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      summary,
    );
  }
}
