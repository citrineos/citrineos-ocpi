// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service } from 'typedi';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { ILogObj, Logger } from 'tslog';
import { GET_CHARGING_STATION_BY_ID_QUERY } from '../graphql/queries/chargingStation.queries';
import { IChargingStationDto } from '@citrineos/base';
import {
  GetChargingStationByIdQueryResult,
  GetChargingStationByIdQueryVariables,
} from '../graphql/operations';

@Service()
export class LocationRepository {
  constructor(
    private readonly logger: Logger<ILogObj>,
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
  ) {}

  public async readChargingStationByStationId(
    stationId: string,
  ): Promise<IChargingStationDto | undefined> {
    this.logger.debug(`Getting charging station ${stationId}`);

    try {
      const variables = { id: stationId };
      const response = await this.ocpiGraphqlClient.request<
        GetChargingStationByIdQueryResult,
        GetChargingStationByIdQueryVariables
      >(GET_CHARGING_STATION_BY_ID_QUERY, variables);
      if (response.ChargingStations && response.ChargingStations.length > 1) {
        this.logger.warn(
          `Multiple charging stations found for id ${stationId}. Returning the first one. All entries: ${JSON.stringify(response.ChargingStations)}`,
        );
      }
      return response.ChargingStations[0] as IChargingStationDto;
    } catch (e) {
      this.logger.error('Error while fetching charging station', e);
      return undefined;
    }
  }
}
