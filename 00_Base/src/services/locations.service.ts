// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import {
  ChargingStation,
  Location,
  SequelizeDeviceModelRepository,
  SequelizeLocationRepository,
} from '@citrineos/data';
import { CitrineOcpiLocationMapper } from '../mapper/CitrineOcpiLocationMapper';
import {
  LocationDTO,
  LocationResponse,
  PaginatedLocationResponse,
} from '../model/DTO/LocationDTO';
import { EvseDTO, EvseResponse, UID_FORMAT } from '../model/DTO/EvseDTO';
import { ConnectorDTO, ConnectorResponse } from '../model/DTO/ConnectorDTO';
import { PaginatedParams } from '../controllers/param/paginated.params';
import { buildOcpiPaginatedResponse, DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { buildOcpiResponse, OcpiResponseStatusCode } from '../model/ocpi.response';
import { OcpiLocationRepository } from '../repository/OcpiLocationRepository';
import { OcpiEvseRepository } from '../repository/OcpiEvseRepository';
import { OcpiConnectorRepository } from '../repository/OcpiConnectorRepository';
import {
  ChargingStationVariableAttributes,
  chargingStationVariableAttributesQuery,
} from '../model/variable-attributes/ChargingStationVariableAttributes';
import {
  EvseVariableAttributes,
  evseVariableAttributesQuery,
} from '../model/variable-attributes/EvseVariableAttributes';
import {
  ConnectorVariableAttributes,
  connectorVariableAttributesQuery,
} from '../model/variable-attributes/ConnectorVariableAttributes';
import { OcpiLocation } from '../model/OcpiLocation';
import { OcpiEvse } from '../model/OcpiEvse';
import { PatchEvseParams } from '../trigger/param/locations/patch.evse.params';
import { PatchConnectorParams } from '../trigger/param/locations/patch.connector.params';
import { OcpiConnector } from '../model/OcpiConnector';
import { LocationsClientApi } from '../trigger/LocationsClientApi';
import { type ILogObj, Logger } from 'tslog';
import { buildOcpiErrorResponse } from '../model/ocpi.error.response';
import {OcpiHeaders} from "../model/OcpiHeaders";

@Service()
export class LocationsService {
  constructor(
    private logger: Logger<ILogObj>,
    private locationRepository: SequelizeLocationRepository,
    private deviceModelRepository: SequelizeDeviceModelRepository,
    private ocpiLocationRepository: OcpiLocationRepository,
    private ocpiEvseRepository: OcpiEvseRepository,
    private ocpiConnectorRepository: OcpiConnectorRepository,
    private locationMapper: CitrineOcpiLocationMapper,
    private locationsClientApi: LocationsClientApi,
  ) { }

  LOCATION_NOT_FOUND_MESSAGE = (locationId: number): string =>
    `Location ${locationId} does not exist.`;
  EVSE_NOT_FOUND_MESSAGE = (evseUid: string): string =>
    `EVSE ${evseUid} does not exist.`;
  CONNECTOR_NOT_FOUND_MESSAGE = (connectorId: number): string =>
    `Connector ${connectorId} does not exist.`;

  /**
   * Sender Methods
   */

  async getLocations(
    ocpiHeaders: OcpiHeaders,
    paginatedParams?: PaginatedParams,
  ): Promise<PaginatedLocationResponse> {
    // TODO add Link header
    const dateFrom = paginatedParams?.date_from;
    const dateTo = paginatedParams?.date_to;
    const limit = paginatedParams?.limit ?? DEFAULT_LIMIT;
    const offset = paginatedParams?.offset ?? DEFAULT_OFFSET;

    const ocpiLocationInfosMap = (
      await this.ocpiLocationRepository.getLocations(
        limit,
        offset,
        dateFrom,
        dateTo,
        ocpiHeaders.toCountryCode,
        ocpiHeaders.toPartyId,
      )
    ).reduce((acc: any, cur) => {
      acc[cur.id] = cur;
      return acc;
    }, {});

    const locationsTotal = await this.ocpiLocationRepository.getLocationsCount(
      dateFrom,
      dateTo,
    );

    if (locationsTotal === 0) {
      return buildOcpiPaginatedResponse(
        OcpiResponseStatusCode.GenericSuccessCode,
        locationsTotal,
        limit,
        offset,
        []
      ) as PaginatedLocationResponse;
    }

    const citrineLocations = await this.locationRepository.readAllByQuery({
      where: {
        id: [...Object.keys(ocpiLocationInfosMap).map((id) => Number(id))]
      },
      include: [ChargingStation],
    });

    const ocpiLocations: LocationDTO[] = [];

    for (const citrineLocation of citrineLocations) {
      const stationIds = citrineLocation.chargingPool.map(
        (chargingStation) => chargingStation.id,
      );
      const chargingStationVariableAttributesMap =
        await this.createChargingStationVariableAttributesMap(stationIds);
      ocpiLocations.push(
        this.locationMapper.mapToOcpiLocation(
          citrineLocation,
          chargingStationVariableAttributesMap,
          ocpiLocationInfosMap[citrineLocation.id],
        ),
      );
    }

    return buildOcpiPaginatedResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      locationsTotal,
      limit,
      offset,
      [...ocpiLocations]
    ) as PaginatedLocationResponse;
  }

  async getLocationById(locationId: number): Promise<LocationResponse> {
    const citrineLocation =
      await this.locationRepository.readLocationById(locationId);

    if (!citrineLocation) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.LOCATION_NOT_FOUND_MESSAGE(locationId)
      ) as LocationResponse;
    }

    const ocpiLocationInfo = await this.ocpiLocationRepository.readByKey(citrineLocation.id);

    const stationIds = citrineLocation.chargingPool.map(
      (chargingStation: ChargingStation) => chargingStation.id,
    );

    const chargingStationVariableAttributesMap =
      await this.createChargingStationVariableAttributesMap(stationIds);

    const mappedLocation = this.locationMapper.mapToOcpiLocation(
      citrineLocation,
      chargingStationVariableAttributesMap,
      ocpiLocationInfo
    );

    return buildOcpiResponse(OcpiResponseStatusCode.GenericSuccessCode, mappedLocation) as LocationResponse;
  }

  async getEvseById(
    locationId: number,
    stationId: string,
    evseId: number,
  ): Promise<EvseResponse> {
    const citrineLocation =
      await this.locationRepository.readLocationById(locationId);

    if (!citrineLocation) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.LOCATION_NOT_FOUND_MESSAGE(locationId)
      ) as EvseResponse;
    }

    const matchingChargingStation = citrineLocation.chargingPool.filter(
      (chargingStation: ChargingStation) => chargingStation.id === stationId,
    );

    if (matchingChargingStation.length === 0) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.EVSE_NOT_FOUND_MESSAGE(UID_FORMAT(stationId, evseId))
      ) as EvseResponse;
    }

    const chargingStationVariableAttributesMap =
      await this.createChargingStationVariableAttributesMap(
        [matchingChargingStation[0].id],
        Number(evseId),
      );

    const ocpiEvseInfo = await this.ocpiEvseRepository
      .readOnlyOneByQuery({
        where: {
          stationId,
          evseId
        }
      })

    const mappedEvse = this.locationMapper.mapToOcpiEvse(
      citrineLocation,
      chargingStationVariableAttributesMap[stationId],
      chargingStationVariableAttributesMap[stationId].evses[Number(evseId)],
      ocpiEvseInfo,
    );

    return buildOcpiResponse(OcpiResponseStatusCode.GenericSuccessCode, mappedEvse);
  }

  async getConnectorById(
    locationId: number,
    stationId: string,
    evseId: number,
    connectorId: number,
  ): Promise<ConnectorResponse> {
    const citrineLocation =
      await this.locationRepository.readLocationById(locationId);

    if (!citrineLocation) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.LOCATION_NOT_FOUND_MESSAGE(locationId)
      ) as ConnectorResponse;
    }

    const matchingChargingStation = citrineLocation.chargingPool.filter(
      (chargingStation) => chargingStation.id === stationId,
    );

    if (matchingChargingStation.length === 0) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.EVSE_NOT_FOUND_MESSAGE(UID_FORMAT(stationId, evseId))
      ) as ConnectorResponse;
    }

    const evseVariableAttributesMap =
      await this.createEvsesVariableAttributesMap(
        matchingChargingStation[0].id,
        [Number(evseId)],
        Number(connectorId),
      );

    if (!evseVariableAttributesMap[evseId].connectors) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.CONNECTOR_NOT_FOUND_MESSAGE(connectorId)
      ) as ConnectorResponse;
    }

    const ocpiConnectorInfo = await this.ocpiConnectorRepository.getConnectorById(stationId, evseId, connectorId);

    const mappedConnector = this.locationMapper.mapToOcpiConnector(
      Number(connectorId),
      evseVariableAttributesMap[evseId],
      evseVariableAttributesMap[evseId].connectors[connectorId],
      ocpiConnectorInfo
    );

    return buildOcpiResponse(OcpiResponseStatusCode.GenericSuccessCode, mappedConnector);
  }

  /**
   * Receiver Methods
   */
  async processLocationCreate(location: Location): Promise<void> {
    this.logger.info(
      "Received Location 'created' event:",
      JSON.stringify(location),
    );
    // const locationResponse = await this.getLocationById(location.id);
    // await this.ocpiLocationRepository.createOrUpdateOcpiLocation(
    //   OcpiLocation.buildWithLastUpdated(location.id, partialLocation.createdAt ?? new Date())
    // );
    // const params = PutLocationParams.build(location.id, locationResponse.data);
    // await this.locationsClientApi.putLocation(params);
  }

  async processLocationUpdate(
    partialLocation: Partial<Location>,
  ): Promise<void> {
    this.logger.info(
      "Received Location 'updated' event:",
      JSON.stringify(partialLocation),
    );

    // const locationId = partialLocation.id;
    //
    // await this.ocpiLocationRepository.createOrUpdateOcpiLocation(
    //   OcpiLocation.buildWithLastUpdated(locationId, partialLocation.updatedAt ?? new Date())
    // );
    //
    // // TODO more robust location update
    // const params = PatchLocationParams.build(
    //   locationId,
    //   partialLocation);
    //
    // await this.locationsClientApi.patchLocation(params);
  }

  async processEvseUpdate(
    stationId: string,
    evseId: number,
    partialEvse: Partial<EvseDTO>,
  ): Promise<void> {
    const chargingStation =
      await this.locationRepository.readChargingStationByStationId(stationId);

    if (!chargingStation || !chargingStation.locationId) {
      throw new Error(`Charging Station ${stationId} does not exist!`);
    }

    const locationId = chargingStation.locationId;
    const lastUpdated = partialEvse.last_updated ?? new Date();

    await this.ocpiEvseRepository.createOrUpdateOcpiEvse(
      OcpiEvse.buildWithLastUpdated(evseId, stationId, lastUpdated)
    );

    await this.ocpiLocationRepository.createOrUpdateOcpiLocation(
      OcpiLocation.buildWithLastUpdated(locationId, lastUpdated)
    );

    const params = PatchEvseParams.build(
      locationId,
      UID_FORMAT(stationId, evseId),
      partialEvse,
    );

    await this.locationsClientApi.patchEvse(params);
  }

  // TODO based on whether the database created or updated the connector
  // choose PUT or PATCH connector respectively
  async processConnectorUpdate(
    stationId: string,
    evseId: number,
    connectorId: number,
    partialConnector: Partial<ConnectorDTO>,
  ): Promise<void> {
    const chargingStation =
      await this.locationRepository.readChargingStationByStationId(stationId);

    if (!chargingStation || !chargingStation.locationId) {
      throw new Error(`Charging Station ${stationId} does not exist!`);
    }

    const locationId = chargingStation.locationId;
    const lastUpdated = partialConnector.last_updated ?? new Date();

    await this.ocpiConnectorRepository.createOrUpdateOcpiConnector(
      OcpiConnector.buildWithLastUpdated(connectorId, evseId, stationId, lastUpdated)
    );

    await this.ocpiEvseRepository.createOrUpdateOcpiEvse(
      OcpiEvse.buildWithLastUpdated(evseId, stationId, lastUpdated)
    );

    await this.ocpiLocationRepository.createOrUpdateOcpiLocation(
      OcpiLocation.buildWithLastUpdated(locationId, lastUpdated)
    );

    const params = PatchConnectorParams.build(
      locationId,
      UID_FORMAT(stationId, evseId),
      connectorId,
      partialConnector,
    );

    await this.locationsClientApi.patchConnector(params);
  }

  /**
   * Helper Methods
   */

  private async createChargingStationVariableAttributesMap(
    stationIds: string[],
    evseId?: number,
    connectorId?: number,
  ): Promise<Record<string, ChargingStationVariableAttributes>> {
    const chargingStationVariableAttributesMap: Record<
      string,
      ChargingStationVariableAttributes
    > = {};

    for (const stationId of stationIds) {
      const matchingAttributes =
        (await this.deviceModelRepository.readAllBySqlString(
          chargingStationVariableAttributesQuery(stationId),
        )) as ChargingStationVariableAttributes[];

      if (matchingAttributes.length === 0) {
        continue;
      }

      const chargingStationAttributes = matchingAttributes[0];
      chargingStationAttributes.id = stationId;

      chargingStationAttributes.evses =
        await this.createEvsesVariableAttributesMap(
          stationId,
          this.getRelevantIdsList(
            chargingStationAttributes.evse_ids_string,
            evseId,
          ),
          connectorId,
        );

      chargingStationVariableAttributesMap[stationId] =
        chargingStationAttributes;
    }

    return chargingStationVariableAttributesMap;
  }

  private async createEvsesVariableAttributesMap(
    stationId: string,
    evseIds: number[],
    connectorId?: number,
  ): Promise<Record<number, EvseVariableAttributes>> {
    const evseAttributesMap: Record<number, EvseVariableAttributes> = {};

    for (const evseId of evseIds) {
      const matchingAttributes =
        (await this.deviceModelRepository.readAllBySqlString(
          evseVariableAttributesQuery(stationId, evseId),
        )) as EvseVariableAttributes[];

      if (matchingAttributes.length === 0) {
        continue;
      }

      const evseAttributes = matchingAttributes[0];
      evseAttributes.id = evseId;

      evseAttributes.connectors =
        await this.createConnectorVariableAttributesMap(
          stationId,
          evseId,
          this.getRelevantIdsList(
            evseAttributes.connector_ids_string,
            connectorId,
          ),
        );

      evseAttributesMap[evseId] = evseAttributes;
    }

    return evseAttributesMap;
  }

  private async createConnectorVariableAttributesMap(
    stationId: string,
    evseId: number,
    connectorIds: number[],
  ): Promise<Record<number, ConnectorVariableAttributes>> {
    const connectorAttributesMap: Record<number, ConnectorVariableAttributes> =
      {};

    for (const connectorId of connectorIds) {
      const matchingAttributes =
        (await this.deviceModelRepository.readAllBySqlString(
          connectorVariableAttributesQuery(stationId, evseId, connectorId),
        )) as ConnectorVariableAttributes[];

      if (matchingAttributes.length === 0) {
        continue;
      }

      connectorAttributesMap[connectorId] = matchingAttributes[0];
    }

    return connectorAttributesMap;
  }

  private getRelevantIdsList(idString: string, idToCompare?: number): number[] {
    return idString
      ? idString
          .split(',')
          .map((id) => Number(id))
          .filter((id) => !idToCompare || id === idToCompare)
      : [];
  }
}
