// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Body, JsonController, Param, Post } from 'routing-controllers';
import { Service } from 'typedi';
import {
  BaseController,
  ResponseSchema,
  ModuleId,
  versionIdParam,
  AdminLocationsService,
  PublishLocationRequest,
  PublishLocationResponse,
  AsAdminEndpoint,
  PublishLocationRequestSchema,
  PublishLocationResponseSchemaName,
} from '@citrineos/ocpi-base';
import { HttpStatus } from '@citrineos/base';

/**
 * Admin API for managing OCPI Location publication.
 * Publishes the entire location hierarchy (location + EVSEs + connectors) in a single operation.
 */
@JsonController(`/admin/:${versionIdParam}/${ModuleId.Locations}`)
@Service()
export class AdminLocationsModuleApi extends BaseController {
  constructor(private readonly adminLocationsService: AdminLocationsService) {
    super();
  }

  /**
   * Publish a location and all its EVSEs and connectors to OCPI partners
   */
  @Post('/:location_id/publish')
  @ResponseSchema(
    PublishLocationRequestSchema,
    PublishLocationResponseSchemaName,
    {
      statusCode: HttpStatus.OK,
      description: 'Location and all its components published successfully',
    },
  )
  @AsAdminEndpoint()
  async publishLocation(
    @Param('location_id') locationId: string,
    @Body() request: PublishLocationRequest,
  ): Promise<PublishLocationResponse> {
    return this.adminLocationsService.publishLocationHierarchy(
      locationId,
      request.partnerIds,
    );
  }

  /**
   * Publish an EVSE and all its connectors to OCPI partners
   */
  @Post('/:location_id/evses/:evse_id/publish')
  @ResponseSchema(
    PublishLocationRequestSchema, // TODO: Should be PublishEvseResponse
    PublishLocationResponseSchemaName, // TODO: Should be PublishEvseResponseSchemaName
    {
      statusCode: HttpStatus.OK,
      description: 'EVSE and all its components published successfully',
    },
  )
  @AsAdminEndpoint()
  async publishEvse(
    @Param('evse_id') evseId: string,
    @Body() request: PublishLocationRequest, // TODO: Should be PublishEvseRequest
  ): Promise<PublishLocationResponse> {
    return this.adminLocationsService.publishEvseHierarchy(
      evseId,
      request.partnerIds,
    );
  }
}
