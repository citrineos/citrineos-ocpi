// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { sequelize as sequelizeCore } from '@citrineos/data';
import { Service } from 'typedi';
import { CitrineOcpiLocationMapper } from '../mapper/CitrineOcpiLocationMapper';
import { LocationDTO, LocationResponse, PaginatedLocationResponse } from '../model/DTO/LocationDTO';
import { EvseResponse, EXTRACT_EVSE_ID, EXTRACT_STATION_ID } from '../model/DTO/EvseDTO';
import { ConnectorResponse } from '../model/DTO/ConnectorDTO';
import { PaginatedParams } from '../controllers/param/paginated.params';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { OcpiResponseStatusCode } from '../model/ocpi.response';
import { OcpiEvseRepository } from '../repository/ocpi.evse.repository';
import {
  ChargingStationVariableAttributes,
  chargingStationVariableAttributesQuery
} from '../model/variable-attributes/ChargingStationVariableAttributes';
import {
  EvseVariableAttributes,
  evseVariableAttributesQuery
} from "../model/variable-attributes/EvseVariableAttributes";
import {
  ConnectorVariableAttributes,
  connectorVariableAttributesQuery
} from "../model/variable-attributes/ConnectorVariableAttributes";

@Service()
export class LocationsService {
  // TODO set timeout on refreshing internal cache

  LOCATION_NOT_FOUND_MESSAGE = (locationId: string): string => `Location ${locationId} does not exist.`;
  EVSE_NOT_FOUND_MESSAGE = (evseUid: string): string => `EVSE ${evseUid} does not exist.`;
  CONNECTOR_NOT_FOUND_MESSAGE = (connectorId: string): string => `Connector ${connectorId} does not exist.`;

  // TODO dynamically choose the appropriate location mapper, not just the Citrine one
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
    // TODO make in-memory pagination
    // TODO use sql literal to pull data from all different tables

    const paginatedLocationResponse = new PaginatedLocationResponse();
    const limit = paginatedParams?.limit ?? DEFAULT_LIMIT;
    const offset = paginatedParams?.offset ?? DEFAULT_OFFSET;

    const citrineLocations = await this.locationRepository.readAllByQuery({
      include: [sequelizeCore.ChargingStation]
    });

    const ocpiLocations: LocationDTO[] = [];

    for (let citrineLocation of citrineLocations) {
      const stationIds = citrineLocation.chargingPool.map(chargingStation => chargingStation.id);
      const chargingStationVariableAttributesMap = await this.createChargingStationVariableAttributesMap(stationIds);
      ocpiLocations.push(this.locationMapper.mapToOcpiLocation(citrineLocation, chargingStationVariableAttributesMap));
    }

    paginatedLocationResponse.offset = offset;
    paginatedLocationResponse.limit = limit;
    paginatedLocationResponse.data = ocpiLocations;
    paginatedLocationResponse.total = citrineLocations.length;

    return paginatedLocationResponse;
  }

  async getLocationById(
    locationId: string
  ): Promise<LocationResponse> {
    const locationResponse = new LocationResponse();
    locationResponse.timestamp = new Date();

    const citrineLocation = await this.getLocationFromDatabase(locationId);

    if (!citrineLocation) {
      locationResponse.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
      locationResponse.status_message = this.LOCATION_NOT_FOUND_MESSAGE(locationId);
      return locationResponse;
    }

    const stationIds = citrineLocation.chargingPool.map(chargingStation => chargingStation.id);
    const chargingStationVariableAttributesMap = await this.createChargingStationVariableAttributesMap(stationIds);

    locationResponse.status_code = OcpiResponseStatusCode.GenericSuccessCode;
    locationResponse.data = this.locationMapper.mapToOcpiLocation(
      citrineLocation,
      chargingStationVariableAttributesMap,
    );

    return locationResponse;
  }

  async getEvseById(
    locationId: string, 
    evseUid: string
  ): Promise<EvseResponse> {
    const stationId = EXTRACT_STATION_ID(evseUid);
    const evseId = EXTRACT_EVSE_ID(evseUid);

    const evseResponse = new EvseResponse();
    evseResponse.timestamp = new Date();

    const citrineLocation = await this.getLocationFromDatabase(locationId);

    if (!citrineLocation) {
      evseResponse.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
      evseResponse.status_message = this.LOCATION_NOT_FOUND_MESSAGE(locationId);
      return evseResponse;
    }

    const matchingChargingStation = citrineLocation.chargingPool.filter(chargingStation => chargingStation.id === stationId)

    if (matchingChargingStation.length === 0) {
      evseResponse.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
      evseResponse.status_message = this.EVSE_NOT_FOUND_MESSAGE(evseUid);
      return evseResponse;
    }

    const chargingStationVariableAttributesMap = await this.createChargingStationVariableAttributesMap([...matchingChargingStation[0].id], Number(evseId));

    evseResponse.status_code = OcpiResponseStatusCode.GenericSuccessCode;
    evseResponse.data = this.locationMapper.mapToOcpiEvse(
      citrineLocation,
      chargingStationVariableAttributesMap[stationId],
      chargingStationVariableAttributesMap[stationId].evses[Number(evseId)]
    );

    return evseResponse;
  }

  async getConnectorById(
    locationId: string,
    evseUid: string,
    connectorId: string
  ): Promise<ConnectorResponse> {
    const stationId = EXTRACT_STATION_ID(evseUid);
    const evseId = EXTRACT_EVSE_ID(evseUid);

    const connectorResponse = new ConnectorResponse();

    const citrineLocation = await this.locationRepository.readByKey(locationId);

    if (!citrineLocation) {
      connectorResponse.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
      connectorResponse.status_message = this.LOCATION_NOT_FOUND_MESSAGE(locationId);
      return connectorResponse;
    }

    const matchingChargingStation = citrineLocation.chargingPool.filter(chargingStation => chargingStation.id === stationId)

    if (matchingChargingStation.length === 0) {
      connectorResponse.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
      connectorResponse.status_message = this.EVSE_NOT_FOUND_MESSAGE(evseUid);
      return connectorResponse;
    }

    const evseVariableAttributesMap = await this.createEvsesVariableAttributesMap(matchingChargingStation[0].id, [Number(evseId)], Number(connectorId));

    if (!evseVariableAttributesMap[Number(evseId)].connectors) {
      connectorResponse.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
      connectorResponse.status_message = this.CONNECTOR_NOT_FOUND_MESSAGE(connectorId);
      return connectorResponse;
    }

    connectorResponse.status_code = OcpiResponseStatusCode.GenericSuccessCode;
    connectorResponse.data = this.locationMapper.mapToOcpiConnector(
      Number(connectorId),
      evseVariableAttributesMap[Number(evseId)],
      evseVariableAttributesMap[Number(evseId)]?.connectors[Number(connectorId)],
    );

    return connectorResponse;
  }

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

  private async createChargingStationVariableAttributesMap(
    stationIds: string[],
    evseId?: number,
    connectorId?: number
  ): Promise<Record<string, ChargingStationVariableAttributes>> {
    const chargingStationVariableAttributesMap: Record<string, ChargingStationVariableAttributes> = {};

    for (let stationId of stationIds) {
      const matchingAttributes =  await this.deviceModelRepository
        .readBySqlString(
          chargingStationVariableAttributesQuery(stationId)
        ) as ChargingStationVariableAttributes[];

      if (matchingAttributes.length === 0) {
        continue;
      }

      const chargingStationAttributes = matchingAttributes[0];
      chargingStationAttributes.id = stationId;

      chargingStationAttributes.evses = await this.createEvsesVariableAttributesMap(
        stationId,
        chargingStationAttributes.evseIds.filter(id => !evseId || id === evseId),
        connectorId
      );

      chargingStationVariableAttributesMap[stationId] = chargingStationAttributes;
    }

    return chargingStationVariableAttributesMap;
  }

  private async createEvsesVariableAttributesMap(
    stationId: string,
    evseIds: number[],
    connectorId?: number
  ): Promise<Record<number, EvseVariableAttributes>> {
    const evseAttributesMap: Record<number, EvseVariableAttributes> = {};

    for (let evseId of evseIds) {
      const matchingAttributes =  await this.deviceModelRepository
        .readBySqlString(evseVariableAttributesQuery(stationId, evseId)) as EvseVariableAttributes[];

      if (matchingAttributes.length === 0) {
        continue;
      }

      const evseAttributes = matchingAttributes[0]
      evseAttributes.id = evseId;

      evseAttributes.connectors = await this.createConnectorVariableAttributesMap(
        stationId,
        evseId,
        evseAttributes.connectorIds.filter(id => !connectorId || id === connectorId)
      );

      evseAttributesMap[evseId] = evseAttributes;
    }

    return evseAttributesMap;
  }

  private async createConnectorVariableAttributesMap(
    stationId: string,
    evseId: number,
    connectorIds: number[]
  ): Promise<Record<number, ConnectorVariableAttributes>> {
    const connectorAttributesMap: Record<number, ConnectorVariableAttributes> = {};

    for (let connectorId of connectorIds) {
      const matchingAttributes = await this.deviceModelRepository
        .readBySqlString(connectorVariableAttributesQuery(stationId, evseId, connectorId)) as ConnectorVariableAttributes[];

      connectorAttributesMap[connectorId] = matchingAttributes?.[0];
    }

    return connectorAttributesMap
  }

}
