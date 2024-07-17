import { Service } from 'typedi';
import { ChargingStationVariableAttributes } from '../model/variableattributes/ChargingStationVariableAttributes';
import { OcpiEvse } from '../model/OcpiEvse';
import { OcpiConnector } from '../model/OcpiConnector';
import { TEMPORARY_CONNECTOR_ID } from '../model/DTO/ConnectorDTO';
import { UID_FORMAT } from '../model/DTO/EvseDTO';
import { OcpiEvseRepository } from '../repository/OcpiEvseRepository';
import { OcpiConnectorRepository } from '../repository/OcpiConnectorRepository';

@Service()
export class OcpiLocationsUtil {
  constructor(
    private ocpiEvseRepository: OcpiEvseRepository,
    private ocpiConnectorRepository: OcpiConnectorRepository
  ) { }

  public async createOcpiEvsesInfoMap(
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

          const ocpiConnectorInfo =
            await this.ocpiConnectorRepository.getConnectorByConnectorId(
              stationId,
              evseId,
              connectorId,
            );

          if (ocpiConnectorInfo) {
            ocpiConnectorsMap[
              `${TEMPORARY_CONNECTOR_ID(stationId, evseId, connectorId)}`
              ] = ocpiConnectorInfo;
          }
        }

        const ocpiEvseInfo = await this.ocpiEvseRepository.getEvseByEvseId(
          evseId,
          stationId,
        );

        if (ocpiEvseInfo) {
          ocpiEvseInfo.ocpiConnectors = ocpiConnectorsMap;
          ocpiEvseMap[`${UID_FORMAT(stationId, evseId)}`] = ocpiEvseInfo;
        }
      }
    }

    return ocpiEvseMap;
  }
}