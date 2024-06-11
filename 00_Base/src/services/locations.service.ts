// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  SequelizeDeviceModelRepository,
  SequelizeLocationRepository,
  VariableAttribute,
} from '@citrineos/data/src/layers/sequelize';
import { Service } from 'typedi';
import { CitrineOcpiLocationMapper } from '../mapper/CitrineOcpiLocationMapper';
import { LocationResponse } from '../model/Location';

@Service()
export class LocationsService {
  // TODO provide flexibility for ocpi location mapper interface
  constructor(
    private locationRepository: SequelizeLocationRepository,
    private deviceModelRepository: SequelizeDeviceModelRepository,
    private locationMapper: CitrineOcpiLocationMapper,
  ) {}

  async getLocationById(id: string): Promise<LocationResponse> {
    const evseVariableAtributesMap: Record<string, VariableAttribute[]> = {};
    const ocppLocation = await this.locationRepository.readByKey(id);
    const locationResponse = new LocationResponse();

    if (!ocppLocation) {
      return locationResponse;
    }

    ocppLocation.chargingPool.forEach(async (chargingStation) => {
      const variableAttributes =
        await this.deviceModelRepository.readAllByQuery({
          stationId: chargingStation.id,
        });

      evseVariableAtributesMap[chargingStation.id] = variableAttributes;
    });

    locationResponse.data = this.locationMapper.mapToOcpiLocation(
      ocppLocation,
      evseVariableAtributesMap,
    );

    return locationResponse;
  }

  async getLocationByEvseId(id: string, evseId: string) {}

  // async getLocations(
  //   paginatedParams: PaginatedParams,
  // ): Promise<PaginatedLocationResponse> {
  //   const locations = await this.locationsRepository.getLocations(
  //     paginatedParams.limit, paginatedParams.offset,
  //     paginatedParams.date_from, paginatedParams.date_to)
  // }
}
