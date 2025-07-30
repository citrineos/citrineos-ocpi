import { Service } from 'typedi';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { ILogObj, Logger } from 'tslog';
import { OcpiLocationDTO } from '../model/DTO/OcpiLocationDTO';

@Service()
export class OcpiLocationRepository {
  constructor(
    private readonly logger: Logger<ILogObj>,
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
  ) {}

  public async updateOcpiLocation(
    ocpiLocation: OcpiLocationDTO,
  ): Promise<OcpiLocationDTO | undefined> {
    this.logger.debug(`Updating OCPI location ${ocpiLocation}`);
    return undefined;

    /*try {
      const variables = { location: ocpiLocation };
      const response = await this.ocpiGraphqlClient.request<{
        ChargingStations: IChargingStationDto[];
      }>(GET_CHARGING_STATION_BY_ID_QUERY, variables);
      if (response.ChargingStations && response.ChargingStations.length > 1) {
        this.logger.warn(
          `Multiple charging stations found for id ${stationId}. Returning the first one. All entries: ${JSON.stringify(response.ChargingStations)}`,
        );
      }
      return response.ChargingStations[0];
    } catch (e) {
      this.logger.error('Error while fetching charging station', e);
      return undefined;
    }*/
  }
}
