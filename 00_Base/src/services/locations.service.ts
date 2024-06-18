// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { sequelize as sequelizeCore } from '@citrineos/data';
import { Service } from 'typedi';
import { CitrineOcpiLocationMapper } from '../mapper/CitrineOcpiLocationMapper';
import { Location as OcpiLocation, LocationResponse, PaginatedLocationResponse } from '../model/Location';
import { EvseResponse } from '../model/Evse';
import { ConnectorResponse } from '../model/Connector';
import { PaginatedParams } from "../controllers/param/paginated.params";
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from "../model/PaginatedResponse";
import { OcpiResponseStatusCode } from "../model/ocpi.response";
import { OcpiEvseRepository } from "../repository/ocpi.evse.repository";

@Service()
export class LocationsService {
  LOCATION_NOT_FOUND_MESSAGE = (locationId: string): string => `Location ${locationId} does not exist.`;
  EVSE_NOT_FOUND_MESSAGE = (evseUid: string): string => `EVSE ${evseUid} does not exist.`;
  CONNECTOR_NOT_FOUND_MESSAGE = (connectorId: string): string => `Connector ${connectorId} does not exist.`;

  // TODO provide flexibility for ocpi location mapper interface
  constructor(
    private locationRepository: sequelizeCore.SequelizeLocationRepository,
    private deviceModelRepository: sequelizeCore.SequelizeDeviceModelRepository,
    private ocpiEvseRepository: OcpiEvseRepository,
    private locationMapper: CitrineOcpiLocationMapper,
  ) {}

  /**
   * Sender Methods
   */

  async getLocations(
    paginatedParams?: PaginatedParams,
  ): Promise<PaginatedLocationResponse> {
    const paginatedLocationResponse = new PaginatedLocationResponse();
    const limit = paginatedParams?.limit ?? DEFAULT_LIMIT;
    const offset = paginatedParams?.offset ?? DEFAULT_OFFSET;
    const dateQuery: any = {
      where: {
        and: []
      }
    };

    // TODO make sure updatedAt is updated when EVSE or Connector has state changes
    if (paginatedParams?.date_from) {
      dateQuery.where.and.push({
        updatedAt: {
          $gte: paginatedParams?.date_from
        }
      });
    }
    if (paginatedParams?.date_to) {
      dateQuery.where.and.push({
        updatedAt: {
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
      const chargingStationVariableAttributesMap: Record<string, sequelizeCore.VariableAttribute[]> = {};

      for (const chargingStation of citrineLocation.chargingPool) {
        chargingStationVariableAttributesMap[chargingStation.id] = await this.deviceModelRepository
          .readAllByQuery({
            stationId: chargingStation.id,
          });
      }

      ocpiLocations.push(this.locationMapper.mapToOcpiLocation(citrineLocation, chargingStationVariableAttributesMap));
    }

    paginatedLocationResponse.offset = offset;
    paginatedLocationResponse.limit = limit;
    paginatedLocationResponse.data = ocpiLocations;
    // TODO add total into paginatedLocationResponse

    return paginatedLocationResponse;
  }

  async getLocationById(
    locationId: string
  ): Promise<LocationResponse> {
    const locationResponse = new LocationResponse();
    const evseVariableAttributesMap: Record<string, sequelizeCore.VariableAttribute[]> = {};

    const citrineLocation = await this.getLocationFromDatabase(locationId);

    if (!citrineLocation) {
      locationResponse.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
      locationResponse.status_message = this.LOCATION_NOT_FOUND_MESSAGE(locationId);
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
    evseUid: string
  ): Promise<EvseResponse> {
    const evseResponse = new EvseResponse();

    const citrineLocation = await this.getLocationFromDatabase(locationId);

    if (!citrineLocation) {
      evseResponse.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
      evseResponse.status_message = this.LOCATION_NOT_FOUND_MESSAGE(locationId);
      return evseResponse;
    }

    // // TODO call evse repository based on charging station id
    // for (let chargingStation of citrineLocation.chargingPool) {
    //   const evseVariableAttributesMap = this.locationMapper.getEvseVariableAttributesMap(
    //     chargingStationVariableAttributesMap[chargingStation.id]);
    //
    //   Object.values(evseVariableAttributesMap).forEach(evseVariableAttributes =>
    //     evses.push(this.mapToOcpiEvse(
    //       citrineLocation,
    //       evseVariableAttributes,
    //       null // TODO add evse ocpi information from new table
    //     ))
    //   )
    // }
    //
    // if (matchingChargingStations.length === 0) {
    //   evseResponse.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
    //   evseResponse.status_message = this.EVSE_NOT_FOUND_MESSAGE(evseUid);
    //   return evseResponse;
    // }
    //
    // const chargingStation = matchingChargingStations[0];
    //
    // const variableAttributes = await this.deviceModelRepository.readAllByQuery({
    //   stationId: chargingStation.id,
    // });
    //
    //
    //
    // // TODO do the EVSE finding more intelligently
    // const matchingChargingStations = citrineLocation.chargingPool
    //   .filter(chargingStation => chargingStation.id === evseUid);
    //
    //
    //
    // const evseVariableAttributesMap = this.locationMapper.getEvseVariableAttributesMap(variableAttributes);
    //
    // for (let chargingStation of ocppLocation.chargingPool) {
    //
    //   Object.values(evseVariableAttributesMap).forEach(evseVariableAttributes =>
    //     evses.push(this.locationMapper.mapToOcpiEvse(
    //       ocppLocation,
    //       evseVariableAttributes,
    //       null // TODO add evse ocpi information, potentially from evse
    //     ))
    //   )
    // }
    //
    // evseResponse.data = this.locationMapper.mapToOcpiEvse(
    //   citrineLocation,
    //   variableAttributes,
    //   null
    // );

    return evseResponse;
  }

  async getConnectorById(
    locationId: string,
    evseUid: string,
    connectorId: string
  ): Promise<ConnectorResponse> {
    const connectorResponse = new ConnectorResponse();

    const citrineLocation = await this.locationRepository.readByKey(locationId);

    if (!citrineLocation) {
      connectorResponse.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
      connectorResponse.status_message = this.LOCATION_NOT_FOUND_MESSAGE(locationId);
      return connectorResponse;
    }

    // const matchingChargingStations = citrineLocation.chargingPool.filter(chargingStation => chargingStation.id === evseUid);
    //
    // if (matchingChargingStations.length === 0) {
    //   return connectorResponse;
    // }
    //
    // const chargingStation = matchingChargingStations[0];
    //
    // const variableAttributes = await this.deviceModelRepository.readAllByQuery({
    //   stationId: chargingStation.id,
    //   component_evse_connectorId: connectorId
    // });
    //
    // const evseVariableAttributesMap = this.locationMapper.getEvseVariableAttributesMap(variableAttributes);
    //
    // const connectorVariableAttributesMap = evseVariableAttributes.reduce(
    //   (acc: Record<string, VariableAttribute[]>, va) => {
    //     acc[(va.evse?.connectorId ?? this.UNKNOWN_ID)] = [...(acc[(va.evse?.connectorId ?? this.UNKNOWN_ID)] ?? []), va];
    //     return acc;
    //   },
    //   {},
    // );
    //
    // connectorResponse.data = this.locationMapper.mapToOcpiConnector(
    //   Number(connectorId),
    //   variableAttributes
    // );

    return connectorResponse;
  }

  // TODO method that gets charging station based on station id
  // then since we're doing evse and connector
  // then we should get the variables

  /**
   * Receiver Methods
   */
  async sendLocationUpdate() {

  }

  async sendEvseUpdate(){

  }

  async sendConnectorUpdate() {

  }

  /**
   * Helper Methods
   */

  private async getLocationFromDatabase(locationId: string): Promise<sequelizeCore.Location | undefined> {
    const matchingCitrineLocations = await this.locationRepository.readAllByQuery({
      where: {
        id: locationId
      },
      include: [sequelizeCore.ChargingStation]
    });

    return matchingCitrineLocations.length > 0 ? matchingCitrineLocations[0] : undefined;
  }

  // private async getEvsesFromDatabase(chargingStationId: string) {
  //   return await this.evseRepository.readAllByQuery({
  //     where: {
  //       chargingStationId
  //     }
  //   });
  // }

}
