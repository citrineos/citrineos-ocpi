import { Service } from 'typedi';
import { OcpiLocationRepository } from '../repository/OcpiLocationRepository';
import { OcpiLocation } from '../model/OcpiLocation';
import { OcpiEvseRepository } from '../repository/OcpiEvseRepository';
import { OcpiConnectorRepository } from '../repository/OcpiConnectorRepository';
import {
  ChargingStationVariableAttributes,
  CONSTRUCT_CHARGING_STATION_VARIABLE_ATTRIBUTES_QUERY,
} from '../model/variableattributes/ChargingStationVariableAttributes';
import { OcpiEvse } from '../model/OcpiEvse';
import { OcpiConnector } from '../model/OcpiConnector';
import {
  ConnectorDTO,
  TEMPORARY_CONNECTOR_ID,
} from '../model/DTO/ConnectorDTO';
import { EvseDTO, UID_FORMAT } from '../model/DTO/EvseDTO';
import {
  ChargingStation,
  Location,
  SequelizeDeviceModelRepository,
  SequelizeLocationRepository,
} from '@citrineos/data';
import { LocationDTO } from '../model/DTO/LocationDTO';
import { type ILogObj, Logger } from 'tslog';
import {
  CONSTRUCT_EVSE_VARIABLE_ATTRIBUTES_QUERY,
  EvseVariableAttributes,
} from '../model/variableattributes/EvseVariableAttributes';
import {
  ConnectorVariableAttributes,
  CONSTRUCT_CONNECTOR_VARIABLE_ATTRIBUTES_QUERY,
} from '../model/variableattributes/ConnectorVariableAttributes';
import { LocationMapper } from '../mapper/LocationMapper';
import { NotFoundError } from 'routing-controllers';

@Service()
export class LocationsDatasource {
  constructor(
    private logger: Logger<ILogObj>,
    private locationRepository: SequelizeLocationRepository,
    private deviceModelRepository: SequelizeDeviceModelRepository,
    private ocpiLocationRepository: OcpiLocationRepository,
    private ocpiEvseRepository: OcpiEvseRepository,
    private ocpiConnectorRepository: OcpiConnectorRepository,
    private locationMapper: LocationMapper,
  ) {}

  LOCATION_NOT_FOUND_MESSAGE = (locationId: number): string =>
    `Location ${locationId} does not exist.`;
  EVSE_NOT_FOUND_MESSAGE = (evseUid: string): string =>
    `EVSE ${evseUid} does not exist.`;
  CONNECTOR_NOT_FOUND_MESSAGE = (connectorId: number): string =>
    `Connector ${connectorId} does not exist.`;

  /**
   * General Service Methods
   */

  public async getLocations(
    limit: number,
    offset: number,
    countryCode: string,
    partyId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<[LocationDTO[], number]> {
    const total = await this.ocpiLocationRepository.getLocationsCount(
      dateFrom,
      dateTo,
      countryCode,
      partyId,
    );

    if (total === 0) {
      return [[], total];
    }

    const ocpiLocationsMap = (
      await this.ocpiLocationRepository.getLocations(
        limit,
        offset,
        dateFrom,
        dateTo,
        countryCode,
        partyId,
      )
    ).reduce(
      (locationsMap: Map<number, OcpiLocation>, ocpiLocation) =>
        locationsMap.set(ocpiLocation.coreLocationId, ocpiLocation),
      new Map<number, OcpiLocation>(),
    );

    const coreLocationsMap = (
      await this.locationRepository.readAllByQuery({
        where: {
          id: [...ocpiLocationsMap.keys()],
        },
        include: [ChargingStation],
      })
    ).reduce(
      (locationsMap: Map<number, Location>, curLocation) =>
        locationsMap.set(curLocation.id, curLocation),
      new Map<number, Location>(),
    );

    const mappedLocations: LocationDTO[] = [];

    for (const [coreLocationId, ocpiLocation] of ocpiLocationsMap) {
      const coreLocation = coreLocationsMap.get(coreLocationId)!;
      const stationIds = coreLocation.chargingPool.map(
        (chargingStation) => chargingStation.id,
      );
      const chargingStationVariableAttributesMap =
        await this.createChargingStationVariableAttributesMap(stationIds);

      ocpiLocation.ocpiEvses = await this.createOcpiEvsesMap(
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

    return [mappedLocations, total];
  }

  public async getLocation(coreLocationId: number): Promise<LocationDTO> {
    const coreLocation =
      await this.locationRepository.readLocationById(coreLocationId);

    if (!coreLocation) {
      throw new NotFoundError(this.LOCATION_NOT_FOUND_MESSAGE(coreLocationId));
    }

    const chargingStationVariableAttributesMap =
      await this.createChargingStationVariableAttributesMap(
        coreLocation.chargingPool.map(
          (chargingStation: ChargingStation) => chargingStation.id,
        ),
      );

    const ocpiLocation =
      await this.ocpiLocationRepository.getLocationByCoreLocationId(
        coreLocation.id,
      );

    if (!ocpiLocation) {
      throw new NotFoundError(this.LOCATION_NOT_FOUND_MESSAGE(coreLocationId));
    }

    ocpiLocation.ocpiEvses = await this.createOcpiEvsesMap(
      chargingStationVariableAttributesMap,
    );

    return this.locationMapper.mapToOcpiLocation(
      coreLocation,
      chargingStationVariableAttributesMap,
      ocpiLocation,
    );
  }

  public async getEvse(
    locationId: number,
    stationId: string,
    evseId: number,
  ): Promise<EvseDTO> {
    const coreLocation =
      await this.locationRepository.readLocationById(locationId);

    if (!coreLocation) {
      throw new NotFoundError(this.LOCATION_NOT_FOUND_MESSAGE(locationId));
    }

    const matchingChargingStation = coreLocation.chargingPool.filter(
      (chargingStation: ChargingStation) => chargingStation.id === stationId,
    );

    if (matchingChargingStation.length === 0) {
      throw new NotFoundError(
        this.EVSE_NOT_FOUND_MESSAGE(UID_FORMAT(stationId, evseId)),
      );
    }

    const chargingStationVariableAttributesMap =
      await this.createChargingStationVariableAttributesMap(
        [matchingChargingStation[0].id],
        evseId,
      );

    if (!chargingStationVariableAttributesMap.get(stationId)) {
      throw new NotFoundError(
        `Variable attributes not found for Charging Station ${stationId}`,
      );
    } else if (
      !chargingStationVariableAttributesMap.get(stationId)!.evses.get(evseId)
    ) {
      throw new NotFoundError(
        `Variable attributes not found for EVSE ${evseId} at Charging Station ${stationId}`,
      );
    }

    const ocpiEvse = (
      await this.createOcpiEvsesMap(chargingStationVariableAttributesMap)
    ).get(`${UID_FORMAT(stationId, evseId)}`);

    if (!ocpiEvse) {
      throw new NotFoundError(
        this.EVSE_NOT_FOUND_MESSAGE(UID_FORMAT(stationId, evseId)),
      );
    }

    return this.locationMapper.mapToEvseDTO(
      coreLocation,
      chargingStationVariableAttributesMap.get(stationId)!,
      chargingStationVariableAttributesMap.get(stationId)!.evses.get(evseId)!,
      ocpiEvse,
    );
  }

  public async getConnector(
    locationId: number,
    stationId: string,
    evseId: number,
    connectorId: number,
  ): Promise<ConnectorDTO> {
    const coreLocation =
      await this.locationRepository.readLocationById(locationId);

    if (!coreLocation) {
      throw new NotFoundError(this.LOCATION_NOT_FOUND_MESSAGE(locationId));
    }

    const matchingChargingStation = coreLocation.chargingPool.filter(
      (chargingStation) => chargingStation.id === stationId,
    );

    if (matchingChargingStation.length === 0) {
      throw new NotFoundError(
        this.EVSE_NOT_FOUND_MESSAGE(UID_FORMAT(stationId, evseId)),
      );
    }

    const evseVariableAttributesMap =
      await this.createEvsesVariableAttributesMap(
        matchingChargingStation[0].id,
        [evseId],
        connectorId,
      );

    if (!evseVariableAttributesMap.get(evseId)) {
      throw new NotFoundError(
        this.EVSE_NOT_FOUND_MESSAGE(UID_FORMAT(stationId, evseId)),
      );
    } else if (!evseVariableAttributesMap.get(evseId)!.connectors) {
      throw new NotFoundError(this.CONNECTOR_NOT_FOUND_MESSAGE(connectorId));
    }

    const ocpiConnector =
      await this.ocpiConnectorRepository.getConnectorByConnectorId(
        stationId,
        evseId,
        connectorId,
      );

    if (!ocpiConnector) {
      throw new NotFoundError(this.CONNECTOR_NOT_FOUND_MESSAGE(connectorId));
    }

    return this.locationMapper.mapToOcpiConnector(
      connectorId,
      evseVariableAttributesMap.get(evseId)!,
      evseVariableAttributesMap.get(evseId)!.connectors.get(connectorId)!,
      ocpiConnector,
    );
  }

  /**
   * Admin Methods
   */

  public async adminCreateOrUpdateLocation(
    coreLocation: Location | Partial<Location>,
    ocpiLocation: OcpiLocation | Partial<OcpiLocation>,
    evses: OcpiEvse[],
    connectors: OcpiConnector[],
  ): Promise<LocationDTO> {
    const savedCoreLocation =
      await this.locationRepository.createOrUpdateLocationWithChargingStations(
        coreLocation,
      );
    ocpiLocation.coreLocationId = savedCoreLocation.id;
    const savedOcpiLocation =
      await this.ocpiLocationRepository.createOrUpdateOcpiLocation(
        ocpiLocation,
      );

    if (!savedOcpiLocation) {
      throw new Error('Location could not be saved due to database error.');
    }

    for (const evse of evses) {
      await this.ocpiEvseRepository.createOrUpdateOcpiEvse(evse);
    }

    for (const connector of connectors) {
      await this.ocpiConnectorRepository.createOrUpdateOcpiConnector(connector);
    }

    let chargingStationVariableAttributesMap = new Map<
      string,
      ChargingStationVariableAttributes
    >();

    if (savedCoreLocation.chargingPool) {
      chargingStationVariableAttributesMap =
        await this.createChargingStationVariableAttributesMap(
          savedCoreLocation.chargingPool.map((station) => station.id),
        );
      savedOcpiLocation.ocpiEvses = await this.createOcpiEvsesMap(
        chargingStationVariableAttributesMap,
      );
    }

    return this.locationMapper.mapToOcpiLocation(
      savedCoreLocation,
      chargingStationVariableAttributesMap,
      savedOcpiLocation,
    );
  }

  public async createChargingStationVariableAttributesMap(
    stationIds: string[],
    evseId?: number,
    connectorId?: number,
  ): Promise<Map<string, ChargingStationVariableAttributes>> {
    const chargingStationVariableAttributesMap = new Map<
      string,
      ChargingStationVariableAttributes
    >();

    for (const stationId of stationIds) {
      const matchingAttributes =
        (await this.deviceModelRepository.readAllBySqlString(
          CONSTRUCT_CHARGING_STATION_VARIABLE_ATTRIBUTES_QUERY(stationId),
        )) as ChargingStationVariableAttributes[];

      if (matchingAttributes.length === 0) {
        this.logger.debug(
          `No variable attributes found for Charging Station ${stationId}, will skip.`,
        );
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

      chargingStationVariableAttributesMap.set(
        stationId,
        chargingStationAttributes,
      );
    }

    return chargingStationVariableAttributesMap;
  }

  /**
   * Helper Methods
   */

  private async createEvsesVariableAttributesMap(
    stationId: string,
    evseIds: number[],
    connectorId?: number,
  ): Promise<Map<number, EvseVariableAttributes>> {
    const evseAttributesMap = new Map<number, EvseVariableAttributes>();

    for (const evseId of evseIds) {
      const matchingAttributes =
        (await this.deviceModelRepository.readAllBySqlString(
          CONSTRUCT_EVSE_VARIABLE_ATTRIBUTES_QUERY(stationId, evseId),
        )) as EvseVariableAttributes[];

      if (matchingAttributes.length === 0) {
        this.logger.debug(
          `No variable attributes found for EVSE ${evseId} at Charging Station ${stationId}, will skip.`,
        );
        continue;
      }

      const evseAttributes = matchingAttributes[0];
      evseAttributes.id = evseId;
      evseAttributes.station_id = stationId;
      evseAttributes.connectors =
        await this.createConnectorVariableAttributesMap(
          stationId,
          evseId,
          this.getRelevantIdsList(
            evseAttributes.connector_ids_string,
            connectorId,
          ),
        );

      evseAttributesMap.set(evseId, evseAttributes);
    }

    return evseAttributesMap;
  }

  private async createConnectorVariableAttributesMap(
    stationId: string,
    evseId: number,
    connectorIds: number[],
  ): Promise<Map<number, ConnectorVariableAttributes>> {
    const connectorAttributesMap = new Map<
      number,
      ConnectorVariableAttributes
    >();

    for (const connectorId of connectorIds) {
      const matchingAttributes =
        (await this.deviceModelRepository.readAllBySqlString(
          CONSTRUCT_CONNECTOR_VARIABLE_ATTRIBUTES_QUERY(
            stationId,
            evseId,
            connectorId,
          ),
        )) as ConnectorVariableAttributes[];

      if (matchingAttributes.length === 0) {
        this.logger.debug(
          `No variable attributes found for Connector ${connectorId} at EVSE ${evseId} in Charging Station ${stationId}, will skip.`,
        );
        continue;
      }

      const connectorAttributes = matchingAttributes[0];
      connectorAttributes.id = connectorId;
      connectorAttributes.evse_id = evseId;
      connectorAttributes.station_id = stationId;

      connectorAttributesMap.set(connectorId, connectorAttributes);
    }

    return connectorAttributesMap;
  }

  private async createOcpiEvsesMap(
    chargingStationAttributesMap: Map<
      string,
      ChargingStationVariableAttributes
    >,
  ): Promise<Map<string, OcpiEvse>> {
    const ocpiEvseMap = new Map<string, OcpiEvse>();

    for (const [
      stationId,
      chargingStationAttributes,
    ] of chargingStationAttributesMap) {
      for (const [evseId, evseAttributes] of chargingStationAttributes.evses) {
        const ocpiConnectorsMap = new Map<string, OcpiConnector>();

        for (const connectorId of evseAttributes.connectors.keys()) {
          const ocpiConnector =
            await this.ocpiConnectorRepository.getConnectorByConnectorId(
              stationId,
              evseId,
              connectorId,
            );

          if (ocpiConnector) {
            ocpiConnectorsMap.set(
              `${TEMPORARY_CONNECTOR_ID(stationId, evseId, connectorId)}`,
              ocpiConnector,
            );
          }
        }

        const ocpiEvse = await this.ocpiEvseRepository.getEvseByEvseId(
          evseId,
          stationId,
        );

        if (ocpiEvse) {
          ocpiEvse.ocpiConnectors = ocpiConnectorsMap;
          ocpiEvseMap.set(`${UID_FORMAT(stationId, evseId)}`, ocpiEvse);
        }
      }
    }

    return ocpiEvseMap;
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
