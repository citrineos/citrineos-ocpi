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
import { EvseResponse } from '../model/Evse';
import { ConnectorResponse } from '../model/Connector';

@Service()
export class LocationsService {
  // TODO if not found, set response to 404

  // TODO provide flexibility for ocpi location mapper interface
  constructor(
    private locationRepository: SequelizeLocationRepository,
    private deviceModelRepository: SequelizeDeviceModelRepository,
    private locationMapper: CitrineOcpiLocationMapper,
  ) {}

  // async getLocations(
  //   paginatedParams: PaginatedParams,
  // ): Promise<PaginatedLocationResponse> {
  //   const locations = await this.locationsRepository.getLocations(
  //     paginatedParams.limit, paginatedParams.offset,
  //     paginatedParams.date_from, paginatedParams.date_to)
  // }

  async getLocationById(
    locationId: string
  ): Promise<LocationResponse> {
    const locationResponse = new LocationResponse();
    const evseVariableAtributesMap: Record<string, VariableAttribute[]> = {};

    const citrineLocation = await this.locationRepository.readByKey(locationId);

    if (!citrineLocation) {
      return locationResponse;
    }

    citrineLocation.chargingPool.forEach(async (chargingStation) => {
      const variableAttributes =
        await this.deviceModelRepository.readAllByQuery({
          stationId: chargingStation.id,
        });

      evseVariableAtributesMap[chargingStation.id] = variableAttributes;
    });

    locationResponse.data = this.locationMapper.mapToOcpiLocation(
      citrineLocation,
      evseVariableAtributesMap,
    );

    return locationResponse;
  }

  async getEvseById(
    locationId: string, 
    evseId: string
  ): Promise<EvseResponse> {
    const evseResponse = new EvseResponse();

    const citrineLocation = await this.locationRepository.readByKey(locationId);

    if (!citrineLocation) {
      return evseResponse;
    }

    const matchingChargingStations = citrineLocation.chargingPool.filter(chargingStation => chargingStation.id === evseId);

    if (matchingChargingStations.length === 0) {
      return evseResponse;
    }

    const chargingStation = matchingChargingStations[0];

    const variableAttributes = await this.deviceModelRepository.readAllByQuery({
      stationId: chargingStation.id,
    });

    evseResponse.data = this.locationMapper.mapToOcpiEvse(
      citrineLocation,
      chargingStation,
      variableAttributes
    );

    return evseResponse;
  }

  async getConnectorById(
    locationId: string,
    evseId: string,
    connectorId: string
  ): Promise<ConnectorResponse> {
    const connectorResponse = new ConnectorResponse();

    const citrineLocation = await this.locationRepository.readByKey(locationId);

    if (!citrineLocation) {
      return connectorResponse;
    }

    const matchingChargingStations = citrineLocation.chargingPool.filter(chargingStation => chargingStation.id === evseId);

    if (matchingChargingStations.length === 0) {
      return connectorResponse;
    }

    const chargingStation = matchingChargingStations[0];

    const variableAttributes = await this.deviceModelRepository.readAllByQuery({
      stationId: chargingStation.id,
      component_evse_connectorId: connectorId
    });

    connectorResponse.data = this.locationMapper.mapToOcpiConnector(
      Number(connectorId),
      variableAttributes
    );

    return connectorResponse;
  }

}
