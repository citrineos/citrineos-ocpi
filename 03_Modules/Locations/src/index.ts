// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import type {
  GetChargingStationByIdQueryResult,
  GetChargingStationByIdQueryVariables,
  GetOwnConnectorForTariffBroadcastQueryVariables,
  GetOwnConnectorForTariffBroadcastQueryResult,
  IDtoEvent,
  OcpiConfig,
} from '@citrineos/ocpi-base';
import {
  AbstractDtoModule,
  AsDtoEventHandler,
  DtoEventObjectType,
  DtoEventType,
  EvseMapper,
  GET_CHARGING_STATION_BY_ID_QUERY,
  GET_OWN_CONNECTOR_FOR_TARIFF_BROADCAST_QUERY,
  LocationsBroadcaster,
  OcpiConfigToken,
  OcpiGraphqlClient,
  OcpiModule,
  RabbitMqDtoReceiver,
} from '@citrineos/ocpi-base';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import { LocationsModuleApi } from './module/LocationsModuleApi.js';
import type {
  ChargingStationDto,
  ConnectorDto,
  EvseDto,
  LocationDto,
  TenantDto,
} from '@zetra/citrineos-base';
import { Inject, Service } from 'typedi';
import { logDbBroadcast } from '@citrineos/ocpi-base';
import type { EvseStatus } from '@citrineos/ocpi-base/src/model/EvseStatus.js';

export { LocationsModuleApi } from './module/LocationsModuleApi.js';
export type { ILocationsModuleApi } from './module/ILocationsModuleApi.js';

type EvseNotifyPayload = Partial<EvseDto> & {
  tenant?: TenantDto;
  ownerTenantPartner?: {
    id: number;
    partyId?: string;
    countryCode?: string;
  };
  ocpiUid?: string | null;
};
type ConnectorNotifyPayload = Partial<ConnectorDto> & {
  tenant?: TenantDto;
  ownerTenantPartner?: {
    id: number;
    partyId?: string;
    countryCode?: string;
  };
  ocpiId?: string | null;
};
type ConnectorTariffNotifyPayload = {
  connectorId: number;
  tenantId: number;
  tenantPartnerId?: number | null;
  tariff_ids?: string[];
  updatedAt: string;
  tenant?: TenantDto;
};
@Service()
export class LocationsModule extends AbstractDtoModule implements OcpiModule {
  constructor(
    @Inject(OcpiConfigToken) config: OcpiConfig,
    readonly logger: Logger<ILogObj>,
    readonly locationsBroadcaster: LocationsBroadcaster,
    readonly ocpiGraphqlClient: OcpiGraphqlClient,
  ) {
    super(config, new RabbitMqDtoReceiver(config, logger), logger);
  }

  getController(): any {
    return LocationsModuleApi;
  }

  async init(): Promise<void> {
    this._logger.info('Initializing Locations Module...');
    await this._receiver.init();
    this._logger.info('Locations Module initialized successfully.');
  }

  async shutdown(): Promise<void> {
    this._logger.info('Shutting down Locations Module...');
    await super.shutdown();
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.Location,
    'LocationNotification',
  )
  async handleLocationInsert(event: IDtoEvent<LocationDto>): Promise<void> {
    logDbBroadcast(this._logger, 'debug', 'Handling Location Insert:', event);
    const locationDto = event._payload;

    const tenant = locationDto.tenant;
    // if the location is owned by a tenant partner, don't broadcast
    if ((locationDto as any).ownerTenantPartnerId != null) {
      logDbBroadcast(
        this._logger,
        'debug',
        'Location Insert for tenant partner, skipping broadcast.',
        event,
      );
      return;
    }

    // await this.locationsBroadcaster.broadcastPutLocation(tenant!, locationDto);
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Location,
    'LocationNotification',
  )
  async handleLocationUpdate(
    event: IDtoEvent<
      Partial<LocationDto> & {
        tenant?: TenantDto;
        ownerTenantPartnerId?: number;
      }
    >,
  ): Promise<void> {
    logDbBroadcast(this._logger, 'debug', 'Handling Location Update:', event);
    const locationDto = event._payload;
    const tenant = locationDto.tenant;

    // if the location is owned by a tenant partner, don't broadcast
    if (
      locationDto.ownerTenantPartnerId != null ||
      event._payload?.ownerTenantPartnerId != null
    ) {
      logDbBroadcast(
        this._logger,
        'debug',
        'Location Update for tenant partner, skipping broadcast.',
        event,
      );
      return;
    }

    // if the location is not owned by a tenant partner, we can broadcast the update
    // await this.locationsBroadcaster.broadcastPatchLocation(
    //   tenant!,
    //   locationDto,
    // );
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.ChargingStation,
    'ChargingStationNotification',
  )
  async handleChargingStationUpdate(
    event: IDtoEvent<Partial<ChargingStationDto>>,
  ): Promise<void> {
    logDbBroadcast(
      this._logger,
      'debug',
      'Handling Charging Station Update:',
      event,
    );
    // Updates are Location/Evse PATCH requests
    // await this.locationsBroadcaster.broadcastPatchEvse(event._payload); // todo
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.Evse,
    'EvseNotification',
  )
  async handleEvseInsert(event: IDtoEvent<EvseDto>): Promise<void> {
    logDbBroadcast(this._logger, 'debug', 'Handling EVSE Insert:', event);
    const evseDto = event._payload;
    if ((evseDto as any).ocpiUid != null) return;
    const tenant = evseDto.tenant;
    const chargingStationResponse = await this.ocpiGraphqlClient.request<
      GetChargingStationByIdQueryResult,
      GetChargingStationByIdQueryVariables
    >(GET_CHARGING_STATION_BY_ID_QUERY, { id: evseDto.stationId });
    if (!chargingStationResponse.ChargingStations[0]) {
      this._logger.error(
        `Charging Station not found for ID ${evseDto.stationId}, cannot broadcast.`,
      );
      return;
    }
    const chargingStationDto = chargingStationResponse
      .ChargingStations[0] as ChargingStationDto;

    // await this.locationsBroadcaster.broadcastPutEvse(
    //   tenant!,
    //   evseDto,
    //   chargingStationDto,
    // );
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Evse,
    'EvseNotification',
  )
  async handleEvseUpdate(event: IDtoEvent<EvseNotifyPayload>): Promise<void> {
    logDbBroadcast(this._logger, 'debug', 'Handling EVSE Update:', event);
    const evseDto = event._payload;

    // if the evse is owned by a tenant partner, don't broadcast
    if (
      evseDto.ocpiUid != null ||
      event._payload?.ownerTenantPartner?.id != null
    ) {
      this._logger.debug('Evse Update for tenant partner, skipping broadcast.');
      return;
    }

    // if the evse is not owned by a tenant partner, we can broadcast the update
    const tenant = evseDto.tenant;

    const chargingStationResponse = await this.ocpiGraphqlClient.request<
      GetChargingStationByIdQueryResult,
      GetChargingStationByIdQueryVariables
    >(GET_CHARGING_STATION_BY_ID_QUERY, { id: evseDto.stationId! });
    if (!chargingStationResponse.ChargingStations[0]) {
      this._logger.error(
        `Charging Station not found for ID ${evseDto.stationId}, cannot broadcast.`,
      );
      return;
    }
    const chargingStationDto = chargingStationResponse
      .ChargingStations[0] as ChargingStationDto;

    // await this.locationsBroadcaster.broadcastPatchEvse(
    //   tenant!,
    //   evseDto,
    //   chargingStationDto,
    // );
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.Connector,
    'ConnectorNotification',
  )
  async handleConnectorInsert(event: IDtoEvent<ConnectorDto>): Promise<void> {
    logDbBroadcast(this._logger, 'debug', 'Handling Connector Insert:', event);
    const connectorDto = event._payload;
    const tenant = connectorDto.tenant;
    if ((connectorDto as any).ocpiId != null) return;
    const chargingStationResponse = await this.ocpiGraphqlClient.request<
      GetChargingStationByIdQueryResult,
      GetChargingStationByIdQueryVariables
    >(GET_CHARGING_STATION_BY_ID_QUERY, { id: connectorDto.stationId });
    if (!chargingStationResponse.ChargingStations[0]) {
      this._logger.error(
        `Charging Station not found for ID ${connectorDto.stationId}, cannot broadcast.`,
      );
      return;
    }
    connectorDto.chargingStation = chargingStationResponse
      .ChargingStations[0] as ChargingStationDto;

    // await this.locationsBroadcaster.broadcastPutConnector(
    //   tenant!,
    //   connectorDto,
    // );
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Connector,
    'ConnectorNotification',
  )
  async handleConnectorUpdate(
    event: IDtoEvent<ConnectorNotifyPayload>,
  ): Promise<void> {
    logDbBroadcast(this._logger, 'debug', 'Handling Connector Update:', event);
    const connectorDto = event._payload;

    // if the connector is owned by a tenant partner, don't broadcast
    if (
      connectorDto.ocpiId != null ||
      event._payload?.ownerTenantPartner?.id != null
    )
      return;
    // if the connector is not owned by a tenant partner, we can broadcast the update
    const tenant = connectorDto.tenant;

    const chargingStationResponse = await this.ocpiGraphqlClient.request<
      GetChargingStationByIdQueryResult,
      GetChargingStationByIdQueryVariables
    >(GET_CHARGING_STATION_BY_ID_QUERY, { id: connectorDto.stationId! });
    if (!chargingStationResponse.ChargingStations[0]) {
      logDbBroadcast(
        this._logger,
        'error',
        `Charging Station not found for ID ${connectorDto.stationId}, cannot broadcast.`,
      );
      return;
    }
    connectorDto.chargingStation = chargingStationResponse
      .ChargingStations[0] as ChargingStationDto;

    if (event.isStatusChanged) {
      const chargingStationDto = connectorDto.chargingStation!;
      const evseDto = chargingStationDto.evses?.find(
        (e: EvseDto) => e.id === connectorDto.evseId,
      );
      if (!evseDto) {
        this._logger.error(
          `EVSE ${connectorDto.evseId} not found on station ${connectorDto.stationId}`,
        );
        return;
      }
      const evseConnectors =
        chargingStationDto.connectors?.filter(
          (c: ConnectorDto) => c.evseId === connectorDto.evseId,
        ) ?? [];
      const evseStatus = EvseMapper.mapEvseStatusFromConnectors(evseConnectors);

      await this.locationsBroadcaster.broadcastPatchEvseStatus(
        tenant!,
        evseDto,
        connectorDto.updatedAt!,
        chargingStationDto,
        evseStatus,
      );
      return;
    }

    // await this.locationsBroadcaster.broadcastPatchConnector(
    //   tenant!,
    //   connectorDto,
    // );
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.ConnectorTariff,
    'ConnectorTariffNotification',
  )
  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.ConnectorTariff,
    'ConnectorTariffNotification',
  )
  @AsDtoEventHandler(
    DtoEventType.DELETE,
    DtoEventObjectType.ConnectorTariff,
    'ConnectorTariffNotification',
  )
  async handleConnectorTariffChange(
    event: IDtoEvent<ConnectorTariffNotifyPayload>,
  ): Promise<void> {
    const payload = event._payload;

    if (payload.tenantPartnerId != null) return;

    // according to OCPI we should to set a tariff update the body should be something like this:
    // {
    //   "tariff_ids": ["15"],
    //   "last_updated": "2019-06-24T12:39:09Z"
    // }
    // but as gireve put tariff on EVSE they require
    //"PATCH  ToIOP_receiver_locations-evse" :
    // You have transfer the status (=AVAILABLE) of the evse
    // AND you also transfer the information of the new tariff.ID associated to the connector.
    // so we need to get the evse and the connectors and the tariffs and broadcast the evse status and the connectors with the new tariff

    //query to get the connector and the tariffs and evse with all the connectors (for gireve receiver)
    const connector = await this.ocpiGraphqlClient.request<
      GetOwnConnectorForTariffBroadcastQueryResult,
      GetOwnConnectorForTariffBroadcastQueryVariables
    >(GET_OWN_CONNECTOR_FOR_TARIFF_BROADCAST_QUERY, {
      connectorId: payload.connectorId,
    });

    const row = connector.Connectors_by_pk;
    if (!row) return;

    // Skip partner-owned locations
    if (row.ChargingStation?.Location?.ownerTenantPartnerId != null) return;

    const tenant = payload.tenant;
    const locationId = row.ChargingStation!.locationId!;
    const tariffIds =
      row.tariffs?.map((t) => t.tariffOcpiId).filter(Boolean) ??
      payload.tariff_ids ??
      [];

    
    const evseConnectors = row.Evse?.Connectors ?? [];
    if (evseConnectors.length === 0) return;

    // broadcast the tariff update for non gireve partners in OCPI specs format
    await this.locationsBroadcaster.broadcastPatchConnectorTariffs(
      tenant!,
      locationId,
      row.stationId!,
      row.evseId!,
      row.id,
      tariffIds,
      new Date(payload.updatedAt ?? row.updatedAt),
    );

    // broadcast the tariff update for gireve partners in Gireve specs format
    // by sending a patch request to the evse with the new tariff and all the connectors of the evse
    await this.locationsBroadcaster.broadcastPatchConnectorTariffsGireve(
      tenant!,
      locationId,
      row.stationId!,
      row.evseId!,
      evseConnectors as unknown as ConnectorDto[],
      row.id!,
      tariffIds,
      new Date(payload.updatedAt ?? row.updatedAt),
    );
  }
}
