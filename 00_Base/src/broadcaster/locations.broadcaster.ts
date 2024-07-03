import { BaseBroadcaster } from './BaseBroadcaster';
import { Service } from 'typedi';
import { Location, SequelizeLocationRepository } from '@citrineos/data';
import { EvseDTO, UID_FORMAT } from '../model/DTO/EvseDTO';
import { OcpiEvse } from '../model/OcpiEvse';
import { OcpiLocation, OcpiLocationProps } from '../model/OcpiLocation';
import { PatchEvseParams } from '../trigger/param/locations/patch.evse.params';
import { ConnectorDTO } from '../model/DTO/ConnectorDTO';
import { OcpiConnector } from '../model/OcpiConnector';
import { PatchConnectorParams } from '../trigger/param/locations/patch.connector.params';
import { LocationsClientApi } from '../trigger/LocationsClientApi';
import { OcpiLocationRepository } from '../repository/OcpiLocationRepository';
import { OcpiEvseRepository } from '../repository/OcpiEvseRepository';
import { OcpiConnectorRepository } from '../repository/OcpiConnectorRepository';
import { ILogObj, Logger } from 'tslog';
import { CredentialsService } from '../services/credentials.service';
import { ModuleId } from '../model/ModuleId';

@Service()
export class LocationsBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly credentialsService: CredentialsService,
    private locationRepository: SequelizeLocationRepository,
    private ocpiLocationRepository: OcpiLocationRepository,
    private ocpiEvseRepository: OcpiEvseRepository,
    private ocpiConnectorRepository: OcpiConnectorRepository,
    private locationsClientApi: LocationsClientApi,
  ) {
    super(logger, credentialsService);
  }

  async broadcastOnLocationCreate(location: Location): Promise<void> {
    this.logger.info(
      "broadcastOnLocationCreate not yet implemented. Received Location 'created' event:",
      JSON.stringify(location),
    );
  }

  async broadcastOnLocationUpdate(
    partialLocation: Partial<Location>,
  ): Promise<void> {
    this.logger.info(
      "broadcastOnLocationUpdate not yet implemented. Received Location 'updated' event:",
      JSON.stringify(partialLocation),
    );
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

    // TODO flexible country code + party id
    await this.broadcastToClients(
      ocpiLocation ? ocpiLocation[OcpiLocationProps.countryCode] : 'US',
      ocpiLocation ? ocpiLocation[OcpiLocationProps.partyId] : 'CPO',
      ModuleId.Locations,
      params,
      this.locationsClientApi,
      this.locationsClientApi.patchEvse,
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

    // TODO flexible country code + party id
    await this.broadcastToClients(
      ocpiLocation ? ocpiLocation[OcpiLocationProps.countryCode] : 'US',
      ocpiLocation ? ocpiLocation[OcpiLocationProps.partyId] : 'CPO',
      ModuleId.Locations,
      params,
      this.locationsClientApi,
      this.locationsClientApi.patchConnector,
    );
  }
}
