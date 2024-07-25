// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Service } from 'typedi';
import {
  ChargingStationVariableAttributes,
  CONSTRUCT_CHARGING_STATION_VARIABLE_ATTRIBUTES_QUERY,
} from '../model/variableattributes/ChargingStationVariableAttributes';
import {
  EvseVariableAttributes,
  CONSTRUCT_EVSE_VARIABLE_ATTRIBUTES_QUERY,
} from '../model/variableattributes/EvseVariableAttributes';
import {
  ConnectorVariableAttributes,
  CONSTRUCT_CONNECTOR_VARIABLE_ATTRIBUTES_QUERY,
} from '../model/variableattributes/ConnectorVariableAttributes';
import { SequelizeDeviceModelRepository } from '@citrineos/data';
import { type ILogObj, Logger } from 'tslog';

@Service()
export class VariableAttributesUtil {
  constructor(
    private logger: Logger<ILogObj>,
    private deviceModelRepository: SequelizeDeviceModelRepository,
  ) {}

  public async createChargingStationVariableAttributesMap(
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

      chargingStationVariableAttributesMap[stationId] =
        chargingStationAttributes;
    }

    return chargingStationVariableAttributesMap;
  }

  public async createEvsesVariableAttributesMap(
    stationId: string,
    evseIds: number[],
    connectorId?: number,
  ): Promise<Record<number, EvseVariableAttributes>> {
    const evseAttributesMap: Record<number, EvseVariableAttributes> = {};

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

      evseAttributesMap[evseId] = evseAttributes;
    }

    return evseAttributesMap;
  }

  public async createConnectorVariableAttributesMap(
    stationId: string,
    evseId: number,
    connectorIds: number[],
  ): Promise<Record<number, ConnectorVariableAttributes>> {
    const connectorAttributesMap: Record<number, ConnectorVariableAttributes> =
      {};

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

      connectorAttributesMap[connectorId] = connectorAttributes;
    }

    return connectorAttributesMap;
  }

  /**
   * Helper Methods
   */

  private getRelevantIdsList(idString: string, idToCompare?: number): number[] {
    return idString
      ? idString
          .split(',')
          .map((id) => Number(id))
          .filter((id) => !idToCompare || id === idToCompare)
      : [];
  }
}
