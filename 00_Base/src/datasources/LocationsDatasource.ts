import { Service } from 'typedi';
import { OcpiLocationRepository } from '../repository/OcpiLocationRepository';
import { OcpiLocation } from '../model/OcpiLocation';
import { OcpiEvseRepository } from '../repository/OcpiEvseRepository';
import { OcpiConnectorRepository } from '../repository/OcpiConnectorRepository';
import { ChargingStationVariableAttributes } from '../model/variableattributes/ChargingStationVariableAttributes';
import { OcpiEvse } from '../model/OcpiEvse';
import { OcpiConnector } from '../model/OcpiConnector';
import { TEMPORARY_CONNECTOR_ID } from '../model/DTO/ConnectorDTO';
import { UID_FORMAT } from '../model/DTO/EvseDTO';

@Service()
export class LocationsDatasource {
  constructor(
    private ocpiLocationRepository: OcpiLocationRepository,
    private ocpiEvseRepository: OcpiEvseRepository,
    private ocpiConnectorRepository: OcpiConnectorRepository,
  ) {}

  public async getOcpiLocations(
    limit: number,
    offset: number,
    countryCode: string,
    partyId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<[OcpiLocation[], number]> {
    const ocpiLocations = await this.ocpiLocationRepository.getLocations(
        limit,
        offset,
        dateFrom,
        dateTo,
        countryCode,
        partyId,
    )

    const total = await this.ocpiLocationRepository.getLocationsCount(
      dateFrom,
      dateTo,
      countryCode,
      partyId
    );

    return [ocpiLocations, total];
  }

  public async getOcpiLocation(coreLocationId: number) {
    return await this.ocpiLocationRepository.getLocationByCoreLocationId(coreLocationId);
  }

  public async getOcpiConnector(
    stationId: string,
    evseId: number,
    connectorId: number
  ): Promise<OcpiConnector | undefined> {
    return await this.ocpiConnectorRepository.getConnectorByConnectorId(
      stationId,
      evseId,
      connectorId,
    );
  }

  public async createOrUpdateOcpiLocation(ocpiLocation: OcpiLocation | Partial<OcpiLocation>): Promise<OcpiLocation | undefined> {
    return await this.ocpiLocationRepository.createOrUpdateOcpiLocation(
      ocpiLocation,
    );
  }

  public async createOrUpdateOcpiEvse(ocpiEvse: OcpiEvse | Partial<OcpiEvse>): Promise<void> {
    await this.ocpiEvseRepository.createOrUpdateOcpiEvse(ocpiEvse);
  }

  public async createOrUpdateOcpiConnector(ocpiConnector: OcpiConnector | Partial<OcpiConnector>): Promise<void> {
    await this.ocpiConnectorRepository.createOrUpdateOcpiConnector(ocpiConnector);
  }

  public async createOcpiEvsesMap(
    chargingStationAttributesMap: Record<
      string,
      ChargingStationVariableAttributes
    >,
  ): Promise<Record<string, OcpiEvse>> {
    const ocpiEvseMap: Record<string, OcpiEvse> = {};

    for (const [stationId, chargingStationAttributes] of Object.entries(
      chargingStationAttributesMap,
    )) {
      for (const [evseIdKey, evseAttributes] of Object.entries(
        chargingStationAttributes.evses,
      )) {
        const ocpiConnectorsMap: Record<string, OcpiConnector> = {};
        const evseId = Number(evseIdKey);

        for (const connectorIdKey of Object.keys(evseAttributes.connectors)) {
          const connectorId = Number(connectorIdKey);

          const ocpiConnector =
            await this.ocpiConnectorRepository.getConnectorByConnectorId(
              stationId,
              evseId,
              connectorId,
            );

          if (ocpiConnector) {
            ocpiConnectorsMap[
              `${TEMPORARY_CONNECTOR_ID(stationId, evseId, connectorId)}`
              ] = ocpiConnector;
          }
        }

        const ocpiEvse = await this.ocpiEvseRepository.getEvseByEvseId(
          evseId,
          stationId,
        );

        if (ocpiEvse) {
          ocpiEvse.ocpiConnectors = ocpiConnectorsMap;
          ocpiEvseMap[`${UID_FORMAT(stationId, evseId)}`] = ocpiEvse;
        }
      }
    }

    return ocpiEvseMap;
  }

}