// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import { ChargingStation, SequelizeDeviceModelRepository, SequelizeLocationRepository } from '@citrineos/data';
import { CitrineOcpiLocationMapper } from '../mapper/CitrineOcpiLocationMapper';
import { LocationDTO, LocationResponse, PaginatedLocationResponse } from '../model/DTO/LocationDTO';
import { EvseResponse, UID_FORMAT } from '../model/DTO/EvseDTO';
import { ConnectorResponse } from '../model/DTO/ConnectorDTO';
import { PaginatedParams } from '../controllers/param/paginated.params';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { OcpiResponseStatusCode } from '../model/ocpi.response';
import { OcpiLocationRepository } from '../repository/OcpiLocationRepository';
import { OcpiEvseRepository } from '../repository/OcpiEvseRepository';
import { OcpiConnectorRepository } from '../repository/OcpiConnectorRepository';
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
import { OcpiLocation } from "../model/Location";
import { OcpiEvse } from "../model/Evse";
import { PatchLocationParams } from "../trigger/param/locations/patch.location.params";
import { PatchEvseParams } from "../trigger/param/locations/patch.evse.params";
import { PatchConnectorParams } from "../trigger/param/locations/patch.connector.params";
import { OcpiConnector } from "../model/Connector";
import { PutLocationParams } from "../trigger/param/locations/put.location.params";
import { ConnectorStatusEnumType } from "../../../../citrineos-core/00_Base";
import { LocationsClientApi } from "../trigger/LocationsClientApi";

@Service()
export class LocationsService {
  // TODO set timeout on refreshing internal cache

  LOCATION_NOT_FOUND_MESSAGE = (locationId: number): string => `Location ${locationId} does not exist.`;
  EVSE_NOT_FOUND_MESSAGE = (evseUid: string): string => `EVSE ${evseUid} does not exist.`;
  CONNECTOR_NOT_FOUND_MESSAGE = (connectorId: number): string => `Connector ${connectorId} does not exist.`;

  // TODO dynamically choose the appropriate location mapper, not just the Citrine one
  constructor(
    private locationRepository: SequelizeLocationRepository,
    private deviceModelRepository: SequelizeDeviceModelRepository,
    private ocpiLocationRepository: OcpiLocationRepository,
    private ocpiEvseRepository: OcpiEvseRepository,
    private ocpiConnectorRepository: OcpiConnectorRepository,
    private locationMapper: CitrineOcpiLocationMapper,
    private locationsClientApi: LocationsClientApi,
) {
    // TODO add database triggers for EVSEs and Connectors if possible

    this.locationRepository.on('created', async (locations) =>
      locations.forEach(async (location) => 
        await this.processLocationCreate(location.id))
    );

    this.locationRepository.on('updated', async (locations) =>
      locations.forEach(async (location) =>
        await this.processLocationUpdate(location.id, new Date(location.updatedAt)))
    );
  }

  /**
   * Sender Methods
   */

  async getLocations(
    paginatedParams?: PaginatedParams,
  ): Promise<PaginatedLocationResponse> {
    // TODO add Link header

    const paginatedLocationResponse = new PaginatedLocationResponse();
    const dateFrom = paginatedParams?.date_from;
    const dateTo = paginatedParams?.date_to;
    const limit = paginatedParams?.limit ?? DEFAULT_LIMIT;
    const offset = paginatedParams?.offset ?? DEFAULT_OFFSET;

    const ocpiLocationInfosMap = (await this.ocpiLocationRepository.getLocations(limit, offset, dateFrom, dateTo))
      .reduce((acc: any, cur) => {
        acc[cur.id] = cur;
        return acc;
      }, {});

    const locationsTotal = await this.ocpiLocationRepository.getLocationsCount(dateFrom, dateTo);

    const citrineLocations = await this.locationRepository.readAllByQuery({
      where: [...Object.keys(ocpiLocationInfosMap).map(id => Number(id))],
      include: [ChargingStation]
    });

    const ocpiLocations: LocationDTO[] = [];

    for (let citrineLocation of citrineLocations) {
      const stationIds = citrineLocation.chargingPool.map(chargingStation => chargingStation.id);
      const chargingStationVariableAttributesMap = await this.createChargingStationVariableAttributesMap(stationIds);
      ocpiLocations.push(this.locationMapper.mapToOcpiLocation(citrineLocation, chargingStationVariableAttributesMap, ocpiLocationInfosMap[citrineLocation.id]));
    }

    paginatedLocationResponse.offset = offset;
    paginatedLocationResponse.limit = limit;
    paginatedLocationResponse.data = ocpiLocations;
    paginatedLocationResponse.total = locationsTotal;

    return paginatedLocationResponse;
  }

  async getLocationById(
    locationId: number
  ): Promise<LocationResponse> {
    const locationResponse = new LocationResponse();
    locationResponse.timestamp = new Date();

    const citrineLocation = await this.locationRepository.readLocationById(locationId);

    if (!citrineLocation) {
      locationResponse.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
      locationResponse.status_message = this.LOCATION_NOT_FOUND_MESSAGE(locationId);
      return locationResponse;
    }

    const stationIds = citrineLocation.chargingPool
      .map((chargingStation: ChargingStation) => chargingStation.id);

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

    const citrineLocation = await this.locationRepository.readLocationById(locationId);

    if (!citrineLocation) {
      evseResponse.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
      evseResponse.status_message = this.LOCATION_NOT_FOUND_MESSAGE(locationId);
      return evseResponse;
    }

    const matchingChargingStation = citrineLocation.chargingPool
      .filter((chargingStation: ChargingStation) => chargingStation.id === stationId);

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
  async processLocationCreate(
    locationId: number
  ): Promise<void> {
    const locationResponse = await this.getLocationById(locationId);
    await this.setOcpiLocationLastUpdated(locationId, new Date());
    const params = PutLocationParams.build(locationId, locationResponse.data);
    await this.locationsClientApi.putLocation(params);
  }

  async processLocationUpdate(
    locationId: number,
    lastUpdated: Date
  ): Promise<void> {
    const location = await this.getLocationById(locationId);

    if (!location) {
      throw new Error(`Location ${locationId} does not exist!`);
    }

    await this.setOcpiLocationLastUpdated(locationId, lastUpdated);

    // TODO more robust location update
    const params = PatchLocationParams.build(
      locationId,
      {
        last_updated: lastUpdated
      });

    await this.locationsClientApi.patchLocation(params);
  }

  async processEvseUpdate(
    stationId: string,
    evseId: number,
    status: ConnectorStatusEnumType,
    lastUpdated: Date
  ): Promise<void> {
    const chargingStation = await this.locationRepository.readChargingStationByStationId(stationId);

    if (!chargingStation || !chargingStation.locationId) {
      throw new Error(`Charging Station ${stationId} does not exist!`);
    }

    const locationId = chargingStation.locationId;

    await this.setOcpiEvseLastUpdated(stationId, evseId, lastUpdated);
    await this.setOcpiLocationLastUpdated(locationId, lastUpdated);

    const params = PatchEvseParams.build(
      locationId,
      UID_FORMAT(stationId, evseId),
      {
        status: this.locationMapper.mapOCPPAvailabilityStateToOCPIEvseStatus(status),
        last_updated: lastUpdated
      });

    await this.locationsClientApi.patchEvse(params);
  }

  // TODO make more flexible to take in any number of different changed fields to map to a ConnectorDTO
  // OR pre-map ConnectorDTO elsewhere before passing in, which requires updates to the mapper for flexibility
  async processConnectorUpdate(
    stationId: string,
    evseId: number,
    connectorId: number,
    status: ConnectorStatusEnumType,
    lastUpdated: Date
  ): Promise<void> {
    const chargingStation = await this.locationRepository.readChargingStationByStationId(stationId);

    if (!chargingStation || !chargingStation.locationId) {
      throw new Error(`Charging Station ${stationId} does not exist!`);
    }

    const locationId = chargingStation.locationId;

    await this.setOcpiConnectorLastUpdated(stationId, evseId, connectorId, lastUpdated);
    await this.setOcpiEvseLastUpdated(stationId, evseId, lastUpdated);
    await this.setOcpiLocationLastUpdated(locationId, lastUpdated);

    const params = PatchConnectorParams.build(
      locationId,
      UID_FORMAT(stationId, evseId),
      connectorId,
      {
        last_updated: lastUpdated
      });

    await this.locationsClientApi.patchConnector(params);
  }

  /**
   * Helper Methods
   */

  private async createChargingStationVariableAttributesMap(
    stationIds: string[],
    evseId?: number,
    connectorId?: number
  ): Promise<Record<string, ChargingStationVariableAttributes>> {
    const chargingStationVariableAttributesMap: Record<string, ChargingStationVariableAttributes> = {};

    for (let stationId of stationIds) {
      const matchingAttributes =  await this.deviceModelRepository
        .readAllBySqlString(
          chargingStationVariableAttributesQuery(stationId)
        ) as ChargingStationVariableAttributes[];

      if (matchingAttributes.length === 0) {
        continue;
      }

      const chargingStationAttributes = matchingAttributes[0];
      chargingStationAttributes.id = stationId;

      chargingStationAttributes.evses = await this.createEvsesVariableAttributesMap(
        stationId,
        this.getRelevantIdsList(chargingStationAttributes.evse_ids_string, evseId),
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
        .readAllBySqlString(evseVariableAttributesQuery(stationId, evseId)) as EvseVariableAttributes[];

      if (matchingAttributes.length === 0) {
        continue;
      }

      const evseAttributes = matchingAttributes[0]
      evseAttributes.id = evseId;

      evseAttributes.connectors = await this.createConnectorVariableAttributesMap(
        stationId,
        evseId,
        this.getRelevantIdsList(evseAttributes.connector_ids_string, connectorId)
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
        .readAllBySqlString(connectorVariableAttributesQuery(stationId, evseId, connectorId)) as ConnectorVariableAttributes[];

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
  ): Promise<void> {
    const ocpiLocation = new OcpiLocation();
    ocpiLocation.id = locationId;
    ocpiLocation.lastUpdated = lastUpdated;
    await this.ocpiLocationRepository.createOrUpdateOcpiLocation(ocpiLocation);
  }

  private async setOcpiEvseLastUpdated(
    stationId: string,
    evseId: number,
    lastUpdated: Date
  ): Promise<void> {
    const ocpiEvse = new OcpiEvse();
    ocpiEvse.stationId = stationId;
    ocpiEvse.evseId = evseId;
    ocpiEvse.lastUpdated = lastUpdated;
    await this.ocpiEvseRepository.createOrUpdateOcpiEvse(ocpiEvse);
  }

  private async setOcpiConnectorLastUpdated(
    stationId: string,
    evseId: number,
    connectorId: number,
    lastUpdated: Date
  ): Promise<void> {
    const ocpiConnector = new OcpiConnector();
    ocpiConnector.stationId = stationId;
    ocpiConnector.evseId = evseId;
    ocpiConnector.connectorId = connectorId;
    ocpiConnector.lastUpdated = lastUpdated;
    await this.ocpiConnectorRepository.createOrUpdateOcpiConnector(ocpiConnector);
  }

  private getRelevantIdsList(
    idString: string,
    idToCompare?: number
  ): number[] {
    return idString ? idString.split(',')
      .map(id => Number(id))
      .filter(id => !idToCompare || id === idToCompare)
      : [];
  }
}
