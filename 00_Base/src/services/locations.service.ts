// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import {
  ChargingStation,
  SequelizeLocationRepository,
} from '@citrineos/data';
import { CitrineOcpiLocationMapper } from '../mapper/CitrineOcpiLocationMapper';
import {
  LocationDTO,
  LocationResponse,
  PaginatedLocationResponse,
} from '../model/DTO/LocationDTO';
import { EvseResponse, UID_FORMAT } from '../model/DTO/EvseDTO';
import { ConnectorResponse } from '../model/DTO/ConnectorDTO';
import { PaginatedParams } from '../controllers/param/paginated.params';
import {
  buildOcpiPaginatedResponse,
  DEFAULT_LIMIT,
  DEFAULT_OFFSET,
} from '../model/PaginatedResponse';
import {
  buildOcpiResponse,
  OcpiResponseStatusCode,
} from '../model/ocpi.response';
import { OcpiLocationRepository } from '../repository/OcpiLocationRepository';
import { OcpiEvseRepository } from '../repository/OcpiEvseRepository';
import { OcpiConnectorRepository } from '../repository/OcpiConnectorRepository';
import { buildOcpiErrorResponse } from '../model/ocpi.error.response';
import { OcpiHeaders } from '../model/OcpiHeaders';
import { OcpiLocationProps } from '../model/OcpiLocation';
import { VariableAttributesUtil } from '../util/VariableAttributesUtil';

@Service()
export class LocationsService {
  constructor(
    private locationRepository: SequelizeLocationRepository,
    private ocpiLocationRepository: OcpiLocationRepository,
    private ocpiEvseRepository: OcpiEvseRepository,
    private ocpiConnectorRepository: OcpiConnectorRepository,
    private variableAttributesUtil: VariableAttributesUtil
  ) {}

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
    const dateFrom = paginatedParams?.dateFrom;
    const dateTo = paginatedParams?.dateTo;
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
      acc[cur[OcpiLocationProps.citrineLocationId]] = cur;
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
        [],
      ) as PaginatedLocationResponse;
    }

    const citrineLocations = await this.locationRepository.readAllByQuery({
      where: {
        id: [
          ...Object.keys(ocpiLocationInfosMap).map((citrineLocationId) =>
            Number(citrineLocationId),
          ),
        ],
      },
      include: [ChargingStation],
    });

    const ocpiLocations: LocationDTO[] = [];

    for (const citrineLocation of citrineLocations) {
      const stationIds = citrineLocation.chargingPool.map(
        (chargingStation) => chargingStation.id,
      );
      const chargingStationVariableAttributesMap =
        await this.variableAttributesUtil.createChargingStationVariableAttributesMap(stationIds);
      ocpiLocations.push(
        CitrineOcpiLocationMapper.mapToOcpiLocation(
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
      [...ocpiLocations],
    ) as PaginatedLocationResponse;
  }

  async getLocationById(locationId: number): Promise<LocationResponse> {
    const citrineLocation =
      await this.locationRepository.readLocationById(locationId);

    if (!citrineLocation) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.LOCATION_NOT_FOUND_MESSAGE(locationId),
      ) as LocationResponse;
    }

    const ocpiLocationInfo =
      await this.ocpiLocationRepository.getLocationByCitrineLocationId(
        citrineLocation.id,
      );

    const stationIds = citrineLocation.chargingPool.map(
      (chargingStation: ChargingStation) => chargingStation.id,
    );

    const chargingStationVariableAttributesMap =
      await this.variableAttributesUtil.createChargingStationVariableAttributesMap(stationIds);

    const mappedLocation = CitrineOcpiLocationMapper.mapToOcpiLocation(
      citrineLocation,
      chargingStationVariableAttributesMap,
      ocpiLocationInfo,
    );

    return buildOcpiResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      mappedLocation,
    ) as LocationResponse;
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
        this.LOCATION_NOT_FOUND_MESSAGE(locationId),
      ) as EvseResponse;
    }

    const matchingChargingStation = citrineLocation.chargingPool.filter(
      (chargingStation: ChargingStation) => chargingStation.id === stationId,
    );

    if (matchingChargingStation.length === 0) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.EVSE_NOT_FOUND_MESSAGE(UID_FORMAT(stationId, evseId)),
      ) as EvseResponse;
    }

    const chargingStationVariableAttributesMap =
      await this.variableAttributesUtil.createChargingStationVariableAttributesMap(
        [matchingChargingStation[0].id],
        Number(evseId),
      );

    const ocpiEvseInfo = await this.ocpiEvseRepository.getEvseByEvseId(
      evseId,
      stationId,
    );

    const mappedEvse = CitrineOcpiLocationMapper.mapToOcpiEvse(
      citrineLocation,
      chargingStationVariableAttributesMap[stationId],
      chargingStationVariableAttributesMap[stationId].evses[Number(evseId)],
      ocpiEvseInfo,
    );

    return buildOcpiResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      mappedEvse,
    );
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
        this.LOCATION_NOT_FOUND_MESSAGE(locationId),
      ) as ConnectorResponse;
    }

    const matchingChargingStation = citrineLocation.chargingPool.filter(
      (chargingStation) => chargingStation.id === stationId,
    );

    if (matchingChargingStation.length === 0) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.EVSE_NOT_FOUND_MESSAGE(UID_FORMAT(stationId, evseId)),
      ) as ConnectorResponse;
    }

    const evseVariableAttributesMap =
      await this.variableAttributesUtil.createEvsesVariableAttributesMap(
        matchingChargingStation[0].id,
        [Number(evseId)],
        Number(connectorId),
      );

    if (!evseVariableAttributesMap[evseId].connectors) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.CONNECTOR_NOT_FOUND_MESSAGE(connectorId),
      ) as ConnectorResponse;
    }

    const ocpiConnectorInfo =
      await this.ocpiConnectorRepository.getConnectorByConnectorId(
        stationId,
        evseId,
        connectorId,
      );

    const mappedConnector = CitrineOcpiLocationMapper.mapToOcpiConnector(
      Number(connectorId),
      evseVariableAttributesMap[evseId],
      evseVariableAttributesMap[evseId].connectors[connectorId],
      ocpiConnectorInfo,
    );

    return buildOcpiResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      mappedConnector,
    );
  }
}
