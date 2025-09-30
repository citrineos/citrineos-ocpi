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
  PublishEvseRequest,
  PublishEvseRequestSchema,
  PublishConnectorRequest,
  PublishConnectorRequestSchema,
} from '@citrineos/ocpi-base';
import { HttpStatus } from '@citrineos/base';

/**
 * Admin API for managing OCPI Location publication.
 */
@JsonController(`/admin/:${versionIdParam}/${ModuleId.Locations}`)
@Service()
export class AdminLocationsModuleApi extends BaseController {
  constructor(private readonly adminLocationsService: AdminLocationsService) {
    super();
  }

  /**
   * Publish a location to OCPI partners.
   * Optionally, publish selected EVSEs within the same location.
   */
  @Post('/:location_id/publish')
  @ResponseSchema(
    PublishLocationRequestSchema,
    PublishLocationResponseSchemaName,
    {
      statusCode: HttpStatus.OK,
      description:
        'Location and optionally its selected EVSEs published successfully',
    },
  )
  @AsAdminEndpoint()
  async publishLocation(
    @Param('location_id') locationId: string,
    @Body() request: PublishLocationRequest,
  ): Promise<PublishLocationResponse> {
    return this.adminLocationsService.publishLocation(
      locationId,
      request.partnerIds,
      request.evseIds,
    );
  }

  /**
   * Publish an EVSE to OCPI partners.
   * Optionally, publish selected connectors within the same EVSE.
   */
  @Post('/:location_id/evses/:evse_id/publish')
  @ResponseSchema(
    PublishEvseRequestSchema,
    PublishLocationResponseSchemaName, // TODO: Should be PublishEvseResponseSchemaName
    {
      statusCode: HttpStatus.OK,
      description:
        'EVSE and optionally its selected connectors published successfully',
    },
  )
  @AsAdminEndpoint()
  async publishEvse(
    @Param('evse_id') evseId: string,
    @Body() request: PublishEvseRequest,
  ): Promise<PublishLocationResponse> {
    return this.adminLocationsService.publishEvse(
      evseId,
      request.partnerIds,
      request.connectorIds,
    );
  }

  /**
   * Publish a connector to OCPI partners.
   */
  @Post('/:location_id/evses/:evse_id/connectors/:connector_id/publish')
  @ResponseSchema(
    PublishConnectorRequestSchema,
    PublishLocationResponseSchemaName, // TODO: Should be PublishConnectorResponseSchemaName
    {
      statusCode: HttpStatus.OK,
      description: 'Connector published successfully',
    },
  )
  @AsAdminEndpoint()
  async publishConnector(
    @Param('connector_id') connectorId: string,
    @Body() request: PublishConnectorRequest,
  ): Promise<PublishLocationResponse> {
    return this.adminLocationsService.publishConnector(
      connectorId,
      request.partnerIds,
    );
  }
}
