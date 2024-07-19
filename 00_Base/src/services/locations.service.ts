// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ILogObj, Logger } from 'tslog';
import { Service } from 'typedi';
import { ChargingStation, SequelizeLocationRepository } from '@citrineos/data';
import { LocationMapper } from '../mapper/LocationMapper';
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
import { OcpiConnectorRepository } from '../repository/OcpiConnectorRepository';
import { buildOcpiErrorResponse } from '../model/ocpi.error.response';
import { OcpiHeaders } from '../model/OcpiHeaders';
import { OcpiLocation } from '../model/OcpiLocation';
import { NotFoundException } from '../exception/NotFoundException';
import { VariableAttributesUtil } from '../util/VariableAttributesUtil';
import { OcpiLocationsUtil } from '../util/OcpiLocationsUtil';

@Service()
export class LocationsService {
  constructor(
    private logger: Logger<ILogObj>,
    private locationMapper: LocationMapper,
    private locationRepository: SequelizeLocationRepository,
    private ocpiLocationRepository: OcpiLocationRepository,
    private ocpiConnectorRepository: OcpiConnectorRepository,
    private variableAttributesUtil: VariableAttributesUtil,
    private ocpiLocationsUtil: OcpiLocationsUtil,
  ) {}

  LOCATION_NOT_FOUND_MESSAGE = (locationId: number): string =>
    `Location ${locationId} does not exist.`;
  EVSE_NOT_FOUND_MESSAGE = (evseUid: string): string =>
    `EVSE ${evseUid} does not exist.`;
  CONNECTOR_NOT_FOUND_MESSAGE = (connectorId: number): string =>
    `Connector ${connectorId} does not exist.`;
  GENERAL_ERROR_MESSAGE = (
    locationId: number,
    evseUid?: string,
    connectorId?: number,
  ) =>
    `Could not map Location ${locationId}${evseUid ? ` with EVSE ${evseUid}` : ''}${connectorId ? ` and Connector ${connectorId}` : ''}`;

  /**
   * Sender Methods
   */

  async getLocations(
    ocpiHeaders: OcpiHeaders,
    paginatedParams?: PaginatedParams,
  ): Promise<PaginatedLocationResponse> {
    this.logger.debug(
      `Getting all locations with headers ${JSON.stringify(ocpiHeaders)} and parameters ${JSON.stringify(paginatedParams)}`,
    );

    // TODO add Link header
    const dateFrom = paginatedParams?.dateFrom;
    const dateTo = paginatedParams?.dateTo;
    const limit = paginatedParams?.limit ?? DEFAULT_LIMIT;
    const offset = paginatedParams?.offset ?? DEFAULT_OFFSET;

    const ocpiLocationsMap = (
      await this.ocpiLocationRepository.getLocations(
        limit,
        offset,
        dateFrom,
        dateTo,
        ocpiHeaders.toCountryCode,
        ocpiHeaders.toPartyId,
      )
    ).reduce((locationsMap: Record<string, OcpiLocation>, curLocation) => {
      locationsMap[curLocation.coreLocationId] = curLocation;
      return locationsMap;
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

    const relevantCoreLocationIds = Object.keys(ocpiLocationsMap).map(
      (coreLocationId) => Number(coreLocationId),
    );
    const coreLocations = await this.locationRepository.readAllByQuery({
      where: {
        id: [...relevantCoreLocationIds],
      },
      include: [ChargingStation],
    });

    const mappedLocations: LocationDTO[] = [];

    for (const coreLocation of coreLocations) {
      const stationIds = coreLocation.chargingPool.map(
        (chargingStation) => chargingStation.id,
      );
      const chargingStationVariableAttributesMap =
        await this.variableAttributesUtil.createChargingStationVariableAttributesMap(
          stationIds,
        );

      const ocpiLocation = ocpiLocationsMap[coreLocation.id];
      ocpiLocation.ocpiEvses = await this.ocpiLocationsUtil.createOcpiEvsesMap(
        chargingStationVariableAttributesMap,
      );

      mappedLocations.push(
        this.locationMapper.mapToOcpiLocation(
          coreLocation,
          chargingStationVariableAttributesMap,
          ocpiLocation,
        ),
      );
    }

    return buildOcpiPaginatedResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      locationsTotal,
      limit,
      offset,
      [...mappedLocations],
    ) as PaginatedLocationResponse;
  }

  async getLocationById(locationId: number): Promise<LocationResponse> {
    this.logger.debug(`Getting location ${locationId}`);

    const coreLocation =
      await this.locationRepository.readLocationById(locationId);

    if (!coreLocation) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.LOCATION_NOT_FOUND_MESSAGE(locationId),
      ) as LocationResponse;
    }

    const stationIds = coreLocation.chargingPool.map(
      (chargingStation: ChargingStation) => chargingStation.id,
    );

    const chargingStationVariableAttributesMap =
      await this.variableAttributesUtil.createChargingStationVariableAttributesMap(
        stationIds,
      );

    const ocpiLocation =
      await this.ocpiLocationRepository.getLocationByCoreLocationId(
        coreLocation.id,
      );

    if (!ocpiLocation) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.LOCATION_NOT_FOUND_MESSAGE(locationId),
      ) as LocationResponse;
    }

    ocpiLocation.ocpiEvses = await this.ocpiLocationsUtil.createOcpiEvsesMap(
      chargingStationVariableAttributesMap,
    );

    try {
      const mappedLocation = this.locationMapper.mapToOcpiLocation(
        coreLocation,
        chargingStationVariableAttributesMap,
        ocpiLocation,
      );

      return buildOcpiResponse(
        OcpiResponseStatusCode.GenericSuccessCode,
        mappedLocation,
      ) as LocationResponse;
    } catch (e) {
      if (e instanceof NotFoundException) {
        return buildOcpiErrorResponse(
          OcpiResponseStatusCode.ClientUnknownLocation,
          this.LOCATION_NOT_FOUND_MESSAGE(locationId),
        ) as LocationResponse;
      } else {
        return buildOcpiErrorResponse(
          OcpiResponseStatusCode.ClientGenericError,
          this.GENERAL_ERROR_MESSAGE(locationId),
        ) as LocationResponse;
      }
    }
  }

  async getEvseById(
    locationId: number,
    stationId: string,
    evseId: number,
  ): Promise<EvseResponse> {
    this.logger.debug(
      `Getting EVSE ${evseId} from Charging Station ${stationId} in Location ${locationId}`,
    );

    const coreLocation =
      await this.locationRepository.readLocationById(locationId);

    if (!coreLocation) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.LOCATION_NOT_FOUND_MESSAGE(locationId),
      ) as EvseResponse;
    }

    const matchingChargingStation = coreLocation.chargingPool.filter(
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

    const ocpiEvse = (
      await this.ocpiLocationsUtil.createOcpiEvsesMap(
        chargingStationVariableAttributesMap,
      )
    )[`${UID_FORMAT(stationId, evseId)}`];

    if (!ocpiEvse) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.EVSE_NOT_FOUND_MESSAGE(UID_FORMAT(stationId, evseId)),
      ) as EvseResponse;
    }

    try {
      const mappedEvse = this.locationMapper.mapToEvseDTO(
        coreLocation,
        chargingStationVariableAttributesMap[stationId],
        chargingStationVariableAttributesMap[stationId].evses[Number(evseId)],
        ocpiEvse,
      );

      return buildOcpiResponse(
        OcpiResponseStatusCode.GenericSuccessCode,
        mappedEvse,
      );
    } catch (e) {
      if (e instanceof NotFoundException) {
        return buildOcpiErrorResponse(
          OcpiResponseStatusCode.ClientUnknownLocation,
          this.EVSE_NOT_FOUND_MESSAGE(UID_FORMAT(stationId, evseId)),
        ) as EvseResponse;
      } else {
        return buildOcpiErrorResponse(
          OcpiResponseStatusCode.ClientGenericError,
          this.GENERAL_ERROR_MESSAGE(locationId, UID_FORMAT(stationId, evseId)),
        ) as EvseResponse;
      }
    }
  }

  async getConnectorById(
    locationId: number,
    stationId: string,
    evseId: number,
    connectorId: number,
  ): Promise<ConnectorResponse> {
    this.logger.debug(
      `Getting Connector ${connectorId} from EVSE ${evseId} in Charging Station ${stationId} in Location ${locationId}`,
    );

    const coreLocation =
      await this.locationRepository.readLocationById(locationId);

    if (!coreLocation) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.LOCATION_NOT_FOUND_MESSAGE(locationId),
      ) as ConnectorResponse;
    }

    const matchingChargingStation = coreLocation.chargingPool.filter(
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

    const ocpiConnector =
      await this.ocpiConnectorRepository.getConnectorByConnectorId(
        stationId,
        evseId,
        connectorId,
      );

    if (!ocpiConnector) {
      return buildOcpiErrorResponse(
        OcpiResponseStatusCode.ClientUnknownLocation,
        this.CONNECTOR_NOT_FOUND_MESSAGE(connectorId),
      ) as ConnectorResponse;
    }

    try {
      const mappedConnector = this.locationMapper.mapToOcpiConnector(
        Number(connectorId),
        evseVariableAttributesMap[evseId],
        evseVariableAttributesMap[evseId].connectors[connectorId],
        ocpiConnector,
      );

      return buildOcpiResponse(
        OcpiResponseStatusCode.GenericSuccessCode,
        mappedConnector,
      );
    } catch (e) {
      if (e instanceof NotFoundException) {
        return buildOcpiErrorResponse(
          OcpiResponseStatusCode.ClientUnknownLocation,
          this.CONNECTOR_NOT_FOUND_MESSAGE(connectorId),
        ) as ConnectorResponse;
      } else {
        return buildOcpiErrorResponse(
          OcpiResponseStatusCode.ClientGenericError,
          this.GENERAL_ERROR_MESSAGE(
            locationId,
            UID_FORMAT(stationId, evseId),
            connectorId,
          ),
        ) as ConnectorResponse;
      }
    }
  }
}
