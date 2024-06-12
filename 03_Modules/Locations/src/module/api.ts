// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Body, Controller, Get, Param } from 'routing-controllers';
import { ILocationsModuleApi } from './interface';
import { AsOcpiFunctionalEndpoint, BaseController, LocationsService, ModuleId, PaginatedLocationResponse, ResponseSchema, generateMockOcpiResponse, Location, LocationResponse } from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { HttpStatus } from '@citrineos/base';
import { ConnectorResponse } from '@citrineos/ocpi-base/src/model/Connector';
import { EvseResponse } from '@citrineos/ocpi-base/src/model/Evse';

/**
 * Server API for the provisioning component.
 */
@Controller(`/${ModuleId.Locations}`)
@Service()
export class LocationsModuleApi extends BaseController implements ILocationsModuleApi {
  /**
   * Constructs a new instance of the class.
   *
   * @param {LocationsService} locationsService - The Locations service.
   */
  constructor(
    readonly locationsService: LocationsService
  ) {
      super();
    }

  // @Get()
  // @AsOcpiFunctionalEndpoint()
  // @ResponseSchema(PaginatedLocationResponse, {
  //   statusCode: HttpStatus.OK,
  //   description: 'Successful response',
  //   examples: {
  //     success: generateMockOcpiResponse(PaginatedLocationResponse)
  //   }
  // })
  // // TODO add query params
  // async getLocations(

  // ): Promise<PaginatedLocationResponse> {
  //   return 
  // }

  @Get('/:locationId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(LocationResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(LocationResponse)
    }
  })
  async getLocationById(
    @Param('locationId') locationId: string
  ): Promise<LocationResponse> {
    return this.locationsService.getLocationById(locationId);
  }

  @Get('/:locationId/:evseId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(EvseResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(EvseResponse)
    }
  })
  async getEvseById(
    @Param('locationId') locationId: string,
    @Param('evseId') evseId: string
  ): Promise<EvseResponse> {
    return this.locationsService.getEvseById(locationId, evseId);
  }

  @Get('/:locationId/:evseId/:connectorId')
  @AsOcpiFunctionalEndpoint()
  @ResponseSchema(ConnectorResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
    examples: {
      success: generateMockOcpiResponse(ConnectorResponse)
    }
  })
  async getConnectorById(
    @Param('locationId') locationId: string,
    @Param('evseId') evseId: string,
    @Param('connectorId') connectorId: string,
  ): Promise<ConnectorResponse> {
    return this.locationsService.getConnectorById(locationId, evseId, connectorId);
  }

}
