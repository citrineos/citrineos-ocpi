import { BaseBroadcaster } from './BaseBroadcaster';
import { Service } from 'typedi';
import { LocationsClientApi } from '../trigger/LocationsClientApi';
import { ILogObj, Logger } from 'tslog';
import { CredentialsService } from '../services/CredentialsService';
import { LocationRepository } from '../repository/LocationRepository';
import { LocationDTO, LocationResponse } from '../model/DTO/LocationDTO';
import { PutLocationParams } from '../trigger/param/locations/PutLocationParams';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import { HttpMethod } from '@citrineos/base';

@Service()
export class LocationsBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly credentialsService: CredentialsService,
    readonly locationRepository: LocationRepository,
    private locationsClientApi: LocationsClientApi,
  ) {
    super();
  }
  async broadcastOnLocationCreateOrUpdate(
    locationDto: LocationDTO,
  ): Promise<void> {
    this.logger.debug(`Broadcasting Location ${locationDto.id}`);

    const params: PutLocationParams = {
      locationId: locationDto.id,
    };

    try {
      await this.locationsClientApi.broadcastToClients({
        cpoCountryCode: locationDto.country_code,
        cpoPartyId: locationDto.party_id,
        moduleId: ModuleId.Locations,
        interfaceRole: InterfaceRole.SENDER,
        httpMethod: HttpMethod.Put,
        clazz: LocationResponse,
        body: locationDto,
        otherParams: params,
      });
    } catch (e) {
      this.logger.debug(
        `Broadcast failed for Location ${locationDto.id} due to error`,
        e,
      );
    }
  }

  async broadcastOnEvseUpdate(
    stationId: string,
    evseId: number,
    partialEvse: Partial<EvseDTO>,
  ): Promise<void> {
    const chargingStation =
      await this.locationRepository.readChargingStationByStationId(stationId);

    if (!chargingStation || !chargingStation.locationId) {
      throw new Error(`Charging Station ${stationId} does not exist!`);
    }

    const locationId = chargingStation.locationId;
    const lastUpdated = partialEvse.last_updated ?? new Date();

    await this.ocpiEvseRepository.createOrUpdateOcpiEvse(
      OcpiEvse.buildWithLastUpdated(evseId, stationId, lastUpdated),
    );

    const ocpiLocation = await this.ocpiLocationRepository.updateOcpiLocation(
      OcpiLocation.buildWithLastUpdated(locationId, lastUpdated),
    );

    const params = PatchEvseParams.build(
      locationId,
      UID_FORMAT(stationId, evseId),
      partialEvse,
    );

    await this.locationsClientApi.broadcastToClients(
      ocpiLocation ? ocpiLocation[OcpiLocationProps.countryCode] : 'US',
      ocpiLocation ? ocpiLocation[OcpiLocationProps.partyId] : 'CPO',
      ModuleId.Locations,
      params,
      this.locationsClientApi.patchEvse.bind(this.locationsClientApi),
    );
  }

  // TODO based on whether the database created or updated the connector
  // choose PUT or PATCH connector respectively
  async broadcastOnConnectorUpdate(
    stationId: string,
    evseId: number,
    connectorId: number,
    partialConnector: Partial<ConnectorDTO>,
  ): Promise<void> {
    const chargingStation =
      await this.locationRepository.readChargingStationByStationId(stationId);

    if (!chargingStation || !chargingStation.locationId) {
      throw new Error(`Charging Station ${stationId} does not exist!`);
    }

    const locationId = chargingStation.locationId;
    const lastUpdated = partialConnector.last_updated ?? new Date();

    await this.ocpiConnectorRepository.createOrUpdateOcpiConnector(
      OcpiConnector.buildWithLastUpdated(
        connectorId,
        evseId,
        stationId,
        lastUpdated,
      ),
    );

    await this.ocpiEvseRepository.createOrUpdateOcpiEvse(
      OcpiEvse.buildWithLastUpdated(evseId, stationId, lastUpdated),
    );

    const ocpiLocation = await this.ocpiLocationRepository.updateOcpiLocation(
      OcpiLocation.buildWithLastUpdated(locationId, lastUpdated),
    );

    const params = PatchConnectorParams.build(
      locationId,
      UID_FORMAT(stationId, evseId),
      connectorId,
      partialConnector,
    );

    await this.locationsClientApi.broadcastToClients(
      ocpiLocation ? ocpiLocation[OcpiLocationProps.countryCode] : 'US',
      ocpiLocation ? ocpiLocation[OcpiLocationProps.partyId] : 'CPO',
      ModuleId.Locations,
      params,
      this.locationsClientApi.patchConnector.bind(this.locationsClientApi),
    );
  }
}
