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
import { Location as OcpiLocation, LocationResponse, PaginatedLocationResponse } from '../model/Location';
import { EvseResponse } from '../model/Evse';
import { ConnectorResponse } from '../model/Connector';
import { PaginatedParams } from "../controllers/param/paginated.params";
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from "../model/PaginatedResponse";

@Service()
export class LocationsService {
  // TODO if not found, set response to 404

  // TODO provide flexibility for ocpi location mapper interface
  constructor(
    private locationRepository: SequelizeLocationRepository,
    private deviceModelRepository: SequelizeDeviceModelRepository,
    private locationMapper: CitrineOcpiLocationMapper,
  ) {}

  async getLocations(
    paginatedParams?: PaginatedParams,
  ): Promise<PaginatedLocationResponse> {
    const response = new PaginatedLocationResponse();
    const limit = paginatedParams?.limit ?? DEFAULT_LIMIT;
    const offset = paginatedParams?.offset ?? DEFAULT_OFFSET;
    const dateQuery: any = {
      where: {
        and: []
      }
    };

    if (paginatedParams?.date_from) {
      dateQuery.where.and.push({
        lastUpdated: {
          $gte: paginatedParams?.date_from
        }
      });
    }
    if (paginatedParams?.date_to) {
      dateQuery.where.and.push({
        lastUpdated: {
          $lt: paginatedParams?.date_to
        }
      });
    }

    const citrineLocations = await this.locationRepository.readAllByQuery({
      limit,
      offset,
      ...(dateQuery.where.and.length > 0 ? dateQuery : {})
    });

    const ocpiLocations: OcpiLocation[] = [];

    for (let citrineLocation of citrineLocations) {
      const chargingStationVariableAttributesMap: Record<string, VariableAttribute[]> = {};

      for (const chargingStation of citrineLocation.chargingPool) {
        chargingStationVariableAttributesMap[chargingStation.id] = await this.deviceModelRepository
          .readAllByQuery({
            stationId: chargingStation.id,
          });
      }

      ocpiLocations.push(this.locationMapper.mapToOcpiLocation(citrineLocation, chargingStationVariableAttributesMap));
    }

    response.offset = offset;
    response.limit = limit;
    response.data = ocpiLocations;
    // TODO add total into response

    return response;

  }

  async getLocationById(
    locationId: string
  ): Promise<LocationResponse> {
    const locationResponse = new LocationResponse();
    const evseVariableAttributesMap: Record<string, VariableAttribute[]> = {};

    const citrineLocation = await this.locationRepository.readByKey(locationId);

    if (!citrineLocation) {
      return locationResponse;
    }

    for (const chargingStation of citrineLocation.chargingPool) {
      evseVariableAttributesMap[chargingStation.id] = await this.deviceModelRepository.readAllByQuery({
        stationId: chargingStation.id,
      });
    }

    locationResponse.data = this.locationMapper.mapToOcpiLocation(
      citrineLocation,
      evseVariableAttributesMap,
    );

    return locationResponse;
  }

  async getEvseById(
    locationId: string, 
    evseId: string
  ): Promise<EvseResponse> {
    const evseResponse = new EvseResponse();

    // TODO change this to read from charging station repository for the evses
    const matchingCitrineLocations = await this.locationRepository.readAllByQuery({
      where: {
        id: locationId
      }
    });

    if (!citrineLocation) {
      return evseResponse;
    }

    const matchingChargingStations = citrineLocation.chargingPool
      .filter(chargingStation => chargingStation.id === evseId);

    if (matchingChargingStations.length === 0) {
      return evseResponse;
    }

    const chargingStation = matchingChargingStations[0];

    const variableAttributes = await this.deviceModelRepository.readAllByQuery({
      stationId: chargingStation.id,
    });

    const evseVariableAttributesMap = this.locationMapper.getEvseVariableAttributesMap(variableAttributes);

    for (let chargingStation of ocppLocation.chargingPool) {

      Object.values(evseVariableAttributesMap).forEach(evseVariableAttributes =>
        evses.push(this.locationMapper.mapToOcpiEvse(
          ocppLocation,
          evseVariableAttributes,
          null // TODO add evse ocpi information, potentially from evse
        ))
      )
    }

    evseResponse.data = this.locationMapper.mapToOcpiEvse(
      citrineLocation,
      variableAttributes,
      null
    );

    return evseResponse;
  }

  async getConnectorById(
    locationId: string,
    evseId: string,
    connectorId: string
  ): Promise<ConnectorResponse> {
    const connectorResponse = new ConnectorResponse();

    // TODO change this to read from charging station repository for the evses
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

    const evseVariableAttributesMap = this.locationMapper.getEvseVariableAttributesMap(variableAttributes);

    const connectorVariableAttributesMap = evseVariableAttributes.reduce(
      (acc: Record<string, VariableAttribute[]>, va) => {
        acc[(va.evse?.connectorId ?? this.UNKNOWN_ID)] = [...(acc[(va.evse?.connectorId ?? this.UNKNOWN_ID)] ?? []), va];
        return acc;
      },
      {},
    );

    connectorResponse.data = this.locationMapper.mapToOcpiConnector(
      Number(connectorId),
      variableAttributes
    );

    return connectorResponse;
  }

}
