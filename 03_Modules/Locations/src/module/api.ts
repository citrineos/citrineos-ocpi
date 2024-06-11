// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Body, Controller, Get } from 'routing-controllers';
import { ILocationsModuleApi } from './interface';
import { AsOcpiFunctionalEndpoint, BaseController, LocationsService, ModuleId, PaginatedLocationResponse, ResponseSchema, generateMockOcpiResponse, Location, LocationResponse } from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { HttpStatus } from '@citrineos/base';

/**
 * Server API for the provisioning component.
 */
@Controller(`/${ModuleId.Locations}`)
@Service()
export class LocationsModuleApi extends BaseController implements ILocationsModuleApi {
  /**
   * Constructs a new instance of the class.
   *
   * @param {LocationsService} locatiosnService - The Locations service.
   */
  constructor(
    locationsService: LocationsService
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

  // @Get('/:locationId')
  // @AsOcpiFunctionalEndpoint()
  // @ResponseSchema(LocationResponse, {
  //   statusCode: HttpStatus.OK,
  //   description: 'Successful response',
  //   examples: {
  //     success: generateMockOcpiResponse(LocationResponse)
  //   }
  // })
  // async getLocationById() {

  // }

  // @Get('/:locationId/:evseId')
  // @AsOcpiFunctionalEndpoint()
  // @ResponseSchema(LocationResponse, {
  //   statusCode: HttpStatus.OK,
  //   description: 'Successful response',
  //   examples: {
  //     success: generateMockOcpiResponse(LocationResponse)
  //   }
  // })
  // async getEvseById() {

  // }

}
