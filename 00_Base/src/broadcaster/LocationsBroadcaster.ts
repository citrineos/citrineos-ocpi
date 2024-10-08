import { BaseBroadcaster } from './BaseBroadcaster';
import { Service } from 'typedi';
import { SequelizeLocationRepository } from '@citrineos/data';
import { EvseDTO, UID_FORMAT } from '../model/DTO/EvseDTO';
import { OcpiEvse } from '../model/OcpiEvse';
import { OcpiLocation, OcpiLocationProps } from '../model/OcpiLocation';
import { PatchEvseParams } from '../trigger/param/locations/PatchEvseParams';
import { ConnectorDTO } from '../model/DTO/ConnectorDTO';
import { OcpiConnector } from '../model/OcpiConnector';
import { PatchConnectorParams } from '../trigger/param/locations/PatchConnectorParams';
import { LocationsClientApi } from '../trigger/LocationsClientApi';
import { OcpiLocationRepository } from '../repository/OcpiLocationRepository';
import { OcpiEvseRepository } from '../repository/OcpiEvseRepository';
import { OcpiConnectorRepository } from '../repository/OcpiConnectorRepository';
import { ILogObj, Logger } from 'tslog';
import { CredentialsService } from '../services/CredentialsService';
import { ModuleId } from '../model/ModuleId';
import { LocationDTO } from '../model/DTO/LocationDTO';
import { PutLocationParams } from '../trigger/param/locations/PutLocationParams';

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
    super();
  }

  async broadcastOnLocationCreateOrUpdate(
    locationDto: LocationDTO,
  ): Promise<void> {
    this.logger.debug(`Broadcasting Location ${locationDto.id}`);

    const params = PutLocationParams.build(Number(locationDto.id), locationDto);

    try {
      await this.locationsClientApi.broadcastToClients(
        locationDto.country_code,
        locationDto.party_id,
        ModuleId.Locations,
        params,
        this.locationsClientApi.putLocation.bind(this.locationsClientApi),
      );
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
