import { BaseBroadcaster } from './BaseBroadcaster';
import { Service } from 'typedi';
import { LocationsClientApi } from '../trigger/LocationsClientApi';
import { ILogObj, Logger } from 'tslog';
import { CredentialsService } from '../services/CredentialsService';
import { LocationRepository } from '../repository/LocationRepository';
import { LocationResponseSchema } from '../model/DTO/LocationDTO';
import { PutLocationParams } from '../trigger/param/locations/PutLocationParams';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import {
  HttpMethod,
  IConnectorDto,
  IEvseDto,
  ILocationDto,
} from '@citrineos/base';
import { UID_FORMAT } from '../model/DTO/EvseDTO';
import { PatchEvseParams } from '../trigger/param/locations/PatchEvseParams';
import { PatchConnectorParams } from '../trigger/param/locations/PatchConnectorParams';
import { OcpiEmptyResponseSchema } from '../model/OcpiEmptyResponse';
import { OcpiLocationRepository } from '../repository/OcpiLocationRepository';
import { OcpiEvseRepository } from '../repository/OcpiEvseRepository';
import { OcpiLocation } from '../model/OcpiLocation';
import { OcpiConnectorRepository } from '../repository/OcpiConnectorRepository';

@Service()
export class LocationsBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly credentialsService: CredentialsService,
    readonly locationRepository: LocationRepository,
    readonly ocpiLocationRepository: OcpiLocationRepository,
    readonly ocpiEvseRepository: OcpiEvseRepository,
    readonly ocpiConnectorRepository: OcpiConnectorRepository,
    readonly locationsClientApi: LocationsClientApi,
  ) {
    super();
  }

  async broadcastPutLocation(locationDto: ILocationDto): Promise<void> {
    await this.broadcastLocation(locationDto, HttpMethod.Put);
  }

  async broadcastPatchLocation(
    locationDto: Partial<ILocationDto>,
  ): Promise<void> {
    await this.broadcastLocation(locationDto, HttpMethod.Patch);
  }

  private async broadcastLocation(
    locationDto: Partial<ILocationDto>,
    method: HttpMethod,
  ): Promise<void> {
    const locationId = locationDto.id;
    if (!locationId) throw new Error('Location ID missing');

    const params: PutLocationParams = { locationId };

    const ocpiLocation =
      await this.ocpiLocationRepository.readOcpiLocationByCoreLocationId(
        locationId,
      );

    if (!ocpiLocation) {
      // todo what to do here if ocpiLocation not found?
      throw new Error(`Ocpi Location not found ${locationId} does not exist!`);
    }

    try {
      await this.locationsClientApi.broadcastToClients({
        cpoCountryCode: ocpiLocation.countryCode ?? 'US',
        cpoPartyId: ocpiLocation.partyId ?? 'CPO',
        moduleId: ModuleId.Locations,
        interfaceRole: InterfaceRole.SENDER,
        httpMethod: method,
        schema: LocationResponseSchema,
        body: locationDto,
        otherParams: params,
      });
    } catch (e) {
      this.logger.error(
        `broadcast${method}Location failed for Location ${locationId}`,
        e,
      );
    }
  }

  async broadcastPutEvse(evse: Partial<IEvseDto>): Promise<void> {
    await this.broadcastEvse(evse, HttpMethod.Put);
  }

  async broadcastPatchEvse(partialEvse: Partial<IEvseDto>): Promise<void> {
    await this.broadcastEvse(partialEvse, HttpMethod.Patch);
  }

  private async broadcastEvse(
    evseData: Partial<IEvseDto>,
    method: HttpMethod,
  ): Promise<void> {
    const stationId = evseData.stationId;
    if (!stationId) {
      throw new Error('Station ID missing in Evse data');
    }
    const evseId = evseData.evseId;
    if (!evseId) {
      throw new Error('EVSE ID missing in Evse data');
    }
    const chargingStation =
      await this.locationRepository.readChargingStationByStationId(stationId);
    if (!chargingStation?.locationId) {
      throw new Error(`Charging Station ${stationId} does not exist!`);
    }

    const locationId = chargingStation.locationId;
    const lastUpdated = evseData.updatedAt ?? new Date();

    await this.ocpiEvseRepository.createOrUpdateOcpiEvse({
      evseId: evseId,
      stationId: stationId,
      lastUpdated: lastUpdated ?? new Date(),
    });

    const ocpiLocation =
      await this.ocpiLocationRepository.updateOcpiLocationByCoreLocationId({
        coreLocationId: locationId,
        lastUpdated,
      } as OcpiLocation);

    const params: PatchEvseParams = {
      locationId,
      evseUid: UID_FORMAT(stationId, evseId),
    };

    try {
      await this.locationsClientApi.broadcastToClients({
        cpoCountryCode: ocpiLocation?.countryCode ?? 'US',
        cpoPartyId: ocpiLocation?.partyId ?? 'CPO',
        moduleId: ModuleId.Locations,
        interfaceRole: InterfaceRole.SENDER,
        httpMethod: method,
        schema: LocationResponseSchema,
        body: evseData,
        otherParams: params,
      });
    } catch (e) {
      this.logger.error(
        `broadcast${method}Evse failed for Location ${locationId}`,
        e,
      );
    }
  }

  async broadcastPutConnector(
    connector: Partial<IConnectorDto>,
  ): Promise<void> {
    await this.broadcastConnector(connector, HttpMethod.Put);
  }

  async broadcastPatchConnector(
    partialConnector: Partial<IConnectorDto>,
  ): Promise<void> {
    await this.broadcastConnector(partialConnector, HttpMethod.Patch);
  }

  private async broadcastConnector(
    connectorData: Partial<IConnectorDto>,
    method: HttpMethod,
  ): Promise<void> {
    const connectorId = connectorData.connectorId;
    if (!connectorId) {
      throw new Error('Connector ID missing in Connector data');
    }
    const stationId = connectorData.stationId;
    if (!stationId) {
      throw new Error('Station ID missing in Connector data');
    }
    const evseId = connectorData.evseId;
    if (!evseId) {
      throw new Error('EVSE ID missing in Connector data');
    }
    const chargingStation =
      await this.locationRepository.readChargingStationByStationId(stationId);
    if (!chargingStation?.locationId) {
      throw new Error(`Charging Station ${stationId} does not exist!`);
    }

    const locationId = chargingStation.locationId;
    const lastUpdated = connectorData.updatedAt ?? new Date();

    await this.ocpiConnectorRepository.createOrUpdateOcpiConnector({
      connectorId,
      evseId,
      stationId,
      lastUpdated,
    });

    await this.ocpiEvseRepository.createOrUpdateOcpiEvse({
      evseId,
      stationId,
      lastUpdated,
    });

    const ocpiLocation =
      await this.ocpiLocationRepository.updateOcpiLocationByCoreLocationId({
        coreLocationId: locationId,
        lastUpdated,
      } as OcpiLocation);

    const params: PatchConnectorParams = {
      locationId,
      evseUid: UID_FORMAT(stationId, evseId),
      connectorId,
    };

    try {
      await this.locationsClientApi.broadcastToClients({
        cpoCountryCode: ocpiLocation?.countryCode ?? 'US',
        cpoPartyId: ocpiLocation?.partyId ?? 'CPO',
        moduleId: ModuleId.Locations,
        interfaceRole: InterfaceRole.SENDER,
        httpMethod: method,
        schema: OcpiEmptyResponseSchema,
        body: connectorData,
        otherParams: params,
      });
    } catch (e) {
      this.logger.error(
        `broadcast${method}Connector failed for Location ${locationId}`,
        e,
      );
    }
  }
}
