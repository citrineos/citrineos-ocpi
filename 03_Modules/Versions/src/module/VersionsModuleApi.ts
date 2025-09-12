// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import {
  AsOcpiRegistrationEndpoint,
  BaseController,
  ModuleId,
  ResponseSchema,
  VersionDetailsResponseDTO,
  versionIdParam,
  VersionListResponseDTO,
  VersionListResponseDTOSchema,
  VersionListResponseDTOSchemaName,
  VersionNumber,
  VersionNumberParam,
  VersionService,
} from '@citrineos/ocpi-base';
import { HttpStatus } from '@citrineos/base';
import { Service } from 'typedi';
import { IVersionsModuleApi } from './IVersionsModuleApi';
import { Get, JsonController, Param } from 'routing-controllers';

@JsonController(`/${ModuleId.Versions}`)
@Service()
export class VersionsModuleApi
  extends BaseController
  implements IVersionsModuleApi
{
  constructor(readonly versionService: VersionService) {
    super();
  }

  @Get('/:tenant_id')
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(
    VersionListResponseDTOSchema,
    VersionListResponseDTOSchemaName,
    {
      statusCode: HttpStatus.OK,
      description: 'Successful response',
      // examples: {}, // todo real example
    },
  )
  async getVersions(
    @Param('tenant_id') tenantId: number,
  ): Promise<VersionListResponseDTO> {
    return this.versionService.getVersions(tenantId);
  }

  @Get(`/:tenant_id/:${versionIdParam}`)
  @AsOcpiRegistrationEndpoint()
  @ResponseSchema(
    VersionListResponseDTOSchema,
    VersionListResponseDTOSchemaName,
    {
      statusCode: HttpStatus.OK,
      description: 'Successful response',
      // examples: {}, // todo real example
    },
  )
  async getVersionDetails(
    @Param('tenant_id') tenantId: number,
    @VersionNumberParam() versionNumber: VersionNumber,
  ): Promise<VersionDetailsResponseDTO> {
    return this.versionService.getVersionDetails(tenantId, versionNumber);
  }
}
