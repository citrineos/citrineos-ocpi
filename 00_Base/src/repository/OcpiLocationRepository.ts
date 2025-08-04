import { Service } from 'typedi';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { ILogObj, Logger } from 'tslog';
import { OcpiLocation } from '../model/OcpiLocation';
import {
  GET_OCPI_LOCATION_BY_CORE_ID_QUERY,
  OCPI_LOCATION_EDIT_BY_CORE_ID_MUTATION,
} from '../graphql/queries/ocpiLocation.queries';

@Service()
export class OcpiLocationRepository {
  constructor(
    private readonly logger: Logger<ILogObj>,
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
  ) {}

  public async readOcpiLocationByCoreLocationId(locationId: number) {
    this.logger.debug(`Read OCPI location by locationid: ${locationId}`);
    try {
      const variables = { coreLocationId: locationId };
      const response = await this.ocpiGraphqlClient.request<{
        Locations: OcpiLocation[];
      }>(GET_OCPI_LOCATION_BY_CORE_ID_QUERY, variables);
      if (response.Locations && response.Locations.length > 1) {
        this.logger.warn(
          `Multiple locations found for id ${locationId}. Returning the first one. All entries: ${JSON.stringify(response.Locations)}`,
        );
      }
      return response.Locations[0];
    } catch (e) {
      this.logger.error('Error while fetching charging station', e);
      return undefined;
    }
  }

  public async updateOcpiLocationByCoreLocationId(
    ocpiLocation: OcpiLocation,
  ): Promise<OcpiLocation | undefined> {
    this.logger.debug(
      `updateOcpiLocationByCoreLocationId OCPI location ${ocpiLocation}`,
    );
    try {
      const variables = {
        coreLocationId: ocpiLocation.coreLocationId,
        object: ocpiLocation,
      };
      const response = await this.ocpiGraphqlClient.request<{
        update_OcpiLocations_by_pk: OcpiLocation;
      }>(OCPI_LOCATION_EDIT_BY_CORE_ID_MUTATION, variables);
      console.log('updateOcpiLocationByCoreLocationId response', response);
      return response.update_OcpiLocations_by_pk;
    } catch (e) {
      this.logger.error('Error while fetching charging station', e);
      return undefined;
    }
  }
}
