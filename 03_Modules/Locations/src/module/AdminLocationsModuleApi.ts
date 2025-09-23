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
  AdminLocationsService,
  PublishLocationRequest,
  PublishLocationResponse,
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
  @Post('/locations/:location_id/publish')
  @ResponseSchema(Object, 'PublishLocationResponse', {
    statusCode: HttpStatus.OK,
    description: 'Location and all its components published successfully',
  })
  async publishLocation(
    @VersionNumberParam() version: VersionNumber,
    @FunctionalEndpointParams() ocpiHeaders: OcpiHeaders,
    @Param('location_id') locationId: string,
    @Body() request: PublishLocationRequest,
  ): Promise<PublishLocationResponse> {
    return this.adminLocationsService.publishLocationHierarchy(
      ocpiHeaders,
      locationId,
      request.partnerIds,
    );
  }
}
