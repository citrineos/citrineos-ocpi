// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Body, JsonController, Param, Post } from 'routing-controllers';
import { Service } from 'typedi';
import {
  BaseController,
  ResponseSchema,
  OcpiHeaders,
  FunctionalEndpointParams,
  ModuleId,
  versionIdParam,
  VersionNumber,
  VersionNumberParam,
  AdminTariffsService,
  PublishTariffRequest,
  PublishTariffResponse,
  AsAdminEndpoint,
} from '@citrineos/ocpi-base';
import { HttpStatus } from '@citrineos/base';

/**
 * Admin API for managing OCPI Tariff publication.
 */
@JsonController(`/admin/:${versionIdParam}/${ModuleId.Tariffs}`)
@Service()
export class AdminTariffsModuleApi extends BaseController {
  constructor(private readonly adminTariffsService: AdminTariffsService) {
    super();
  }

  /**
   * Publish a tariff to OCPI partners
   */
  @Post('/:tariff_id/publish')
  @ResponseSchema(Object, 'PublishTariffResponse', {
    statusCode: HttpStatus.OK,
    description: 'Tariff published successfully',
  })
  @AsAdminEndpoint()
  async publishTariff(
    @VersionNumberParam() version: VersionNumber,
    @FunctionalEndpointParams() ocpiHeaders: OcpiHeaders,
    @Param('tariff_id') tariffId: string,
    @Body() request: PublishTariffRequest,
  ): Promise<PublishTariffResponse> {
    return this.adminTariffsService.publishTariff(
      ocpiHeaders,
      tariffId,
      request.partnerIds,
    );
  }
}
