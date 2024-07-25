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
    private ocpiConnectorRepository: OcpiConnectorRepository,
  ) {}

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
