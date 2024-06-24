// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { sequelize as sequelizeCore } from '@citrineos/data';
import { Service } from 'typedi';
import { CitrineOcpiLocationMapper } from '../mapper/CitrineOcpiLocationMapper';
import { LocationDTO, LocationResponse, PaginatedLocationResponse } from '../model/DTO/LocationDTO';
import { EvseResponse, UID_FORMAT } from '../model/DTO/EvseDTO';
import { ConnectorResponse } from '../model/DTO/ConnectorDTO';
import { PaginatedParams } from '../controllers/param/paginated.params';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { OcpiResponseStatusCode } from '../model/ocpi.response';
import { OcpiLocationRepository } from '../repository/ocpi.location.repository';
import { OcpiEvseRepository } from '../repository/ocpi.evse.repository';
import { OcpiConnectorRepository } from '../repository/ocpi.connector.repository';
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
import { PutEvseParams } from "../trigger/param/locations/put.evse.params";
import { PutConnectorParams } from "../trigger/param/locations/put.connector.params";
import { OcpiLocation } from "../model/Location";
import { OcpiEvse } from "../model/Evse";
import { PutLocationParams } from "../trigger/param/locations/put.location.params";
import { PatchLocationParams } from "../trigger/param/locations/patch.location.params";
import { PatchEvseParams } from "../trigger/param/locations/patch.evse.params";
import { PatchConnectorParams } from "../trigger/param/locations/patch.connector.params";

@Service()
export class LocationsService {
  // TODO set timeout on refreshing internal cache

  LOCATION_NOT_FOUND_MESSAGE = (locationId: number): string => `Location ${locationId} does not exist.`;
  EVSE_NOT_FOUND_MESSAGE = (evseUid: string): string => `EVSE ${evseUid} does not exist.`;
  CONNECTOR_NOT_FOUND_MESSAGE = (connectorId: number): string => `Connector ${connectorId} does not exist.`;

  // TODO dynamically choose the appropriate location mapper, not just the Citrine one
  constructor(
    private locationRepository: sequelizeCore.SequelizeLocationRepository,
    private deviceModelRepository: sequelizeCore.SequelizeDeviceModelRepository,
    private ocpiLocationRepository: OcpiLocationRepository,
    private ocpiEvseRepository: OcpiEvseRepository,
    private ocpiConnectorRepository: OcpiConnectorRepository,
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
    locationId: number
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
    locationId: number,
    stationId: string,
    evseId: number
  ): Promise<EvseResponse> {
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
      evseResponse.status_message = this.EVSE_NOT_FOUND_MESSAGE(UID_FORMAT(stationId, evseId));
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
    locationId: number,
    stationId: string,
    evseId: number,
    connectorId: number
  ): Promise<ConnectorResponse> {
    const connectorResponse = new ConnectorResponse();

    const citrineLocation = await this.locationRepository.readByKey(String(locationId));

    if (!citrineLocation) {
      connectorResponse.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
      connectorResponse.status_message = this.LOCATION_NOT_FOUND_MESSAGE(locationId);
      return connectorResponse;
    }

    const matchingChargingStation = citrineLocation.chargingPool.filter(chargingStation => chargingStation.id === stationId)

    if (matchingChargingStation.length === 0) {
      connectorResponse.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
      connectorResponse.status_message = this.EVSE_NOT_FOUND_MESSAGE(UID_FORMAT(stationId, evseId));
      return connectorResponse;
    }

    const evseVariableAttributesMap = await this.createEvsesVariableAttributesMap(matchingChargingStation[0].id, [Number(evseId)], Number(connectorId));

    if (!evseVariableAttributesMap[evseId].connectors) {
      connectorResponse.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
      connectorResponse.status_message = this.CONNECTOR_NOT_FOUND_MESSAGE(connectorId);
      return connectorResponse;
    }

    connectorResponse.status_code = OcpiResponseStatusCode.GenericSuccessCode;
    connectorResponse.data = this.locationMapper.mapToOcpiConnector(
      Number(connectorId),
      evseVariableAttributesMap[evseId],
      evseVariableAttributesMap[evseId].connectors[connectorId],
    );

    return connectorResponse;
  }

  /**
   * Receiver Methods
   */
  async processLocationUpdate(
    locationId: number,
    lastUpdated: Date
  ): Promise<PatchLocationParams> {
    await this.setOcpiLocationLastUpdated(locationId, lastUpdated);
    return new PatchLocationParams();
  }

  async processEvseUpdate(
    stationId: string,
    evseId: number,
    lastUpdated: Date
  ): Promise<PatchEvseParams> {
    const chargingStation = await this.locationRepository.readChargingStationByStationId(stationId);

    if (!chargingStation || !chargingStation.locationId) {
      throw new Error('Charging Station does not exist!'); // TODO more descriptive error
    }

    // TODO call evse update for last updated

    const locationId = chargingStation.locationId;
    const evseResponse = await this.getEvseById(locationId, stationId, evseId);
    return PatchEvseParams.build(locationId, UID_FORMAT(stationId, evseId), evseResponse.data);
  }

  async processConnectorUpdate(
    stationId: string,
    evseId: number,
    connectorId: number,
    lastUpdated: Date
  ): Promise<PatchConnectorParams> {
    const chargingStation = await this.locationRepository.readChargingStationByStationId(stationId);

    if (!chargingStation || !chargingStation.locationId) {
      throw new Error('Charging Station does not exist!'); // TODO more descriptive error
    }

    // TODO call connector update for last updated

    const locationId = chargingStation.locationId;
    const connectorResponse = await this.getConnectorById(locationId, stationId, evseId, connectorId);
    return PatchConnectorParams.build(locationId, UID_FORMAT(stationId, evseId), connectorId, connectorResponse.data);
  }

  /**
   * Helper Methods
   */

  private async getLocationFromDatabase(locationId: number): Promise<sequelizeCore.Location | undefined> {
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

      if (matchingAttributes.length === 0) {
        continue;
      }

      connectorAttributesMap[connectorId] = matchingAttributes[0];
    }

    return connectorAttributesMap
  }

  private async setOcpiLocationLastUpdated(
    locationId: number,
    lastUpdated: Date
  ) {
    const ocpiLocation = new OcpiLocation();
    ocpiLocation.id = locationId;
    ocpiLocation.lastUpdated = lastUpdated;
    await this.ocpiLocationRepository.createOrUpdateOcpiLocation(ocpiLocation);
  }

  private async setOcpiEvseLastUpdated(
    stationId: string,
    evseId: number,
    lastUpdated: Date
  ) {
    const ocpiEvse = new OcpiEvse();
    ocpiEvse.lastUpdated = lastUpdated;
    await this.ocpiEvseRepository.createOrUpdateOcpiEvse(ocpiEvse);
  }

}
