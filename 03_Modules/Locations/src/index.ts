// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import {
  AbstractDtoModule,
  AsDtoEventHandler,
  DtoEventObjectType,
  DtoEventType,
  GET_CHARGING_STATION_BY_ID_QUERY,
  GetChargingStationByIdQueryResult,
  GetChargingStationByIdQueryVariables,
  IDtoEvent,
  LocationsBroadcaster,
  OcpiConfig,
  OcpiConfigToken,
  OcpiGraphqlClient,
  OcpiModule,
  RabbitMqDtoReceiver,
} from '@citrineos/ocpi-base';
import { ILogObj, Logger } from 'tslog';
import { LocationsModuleApi } from './module/LocationsModuleApi';
import { AdminLocationsModuleApi } from './module/AdminLocationsModuleApi';
import {
  IChargingStationDto,
  IConnectorDto,
  IEvseDto,
  ILocationDto,
} from '@citrineos/base';
import { Inject, Service } from 'typedi';

export { LocationsModuleApi } from './module/LocationsModuleApi';
export { AdminLocationsModuleApi } from './module/AdminLocationsModuleApi';
export { ILocationsModuleApi } from './module/ILocationsModuleApi';

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
    return [LocationsModuleApi, AdminLocationsModuleApi];
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
  async handleLocationInsert(event: IDtoEvent<ILocationDto>): Promise<void> {
    this._logger.debug(`Handling Location Insert: ${JSON.stringify(event)}`);
    // No automatic publishing on INSERT - publication is now controlled administratively via location-centric API
    this._logger.info(
      `Location ${event._payload.id} created but not published - use admin API to publish when ready`,
    );
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Location,
    'LocationNotification',
  )
  async handleLocationUpdate(
    event: IDtoEvent<Partial<ILocationDto>>,
  ): Promise<void> {
    this._logger.debug(`Handling Location Update: ${JSON.stringify(event)}`);
    const locationDto = event._payload;

    // Only allow PATCH updates if the location has already been published
    if (locationDto.isPublished) {
      const tenant = locationDto.tenant;
      if (!tenant) {
        this._logger.error(
          `Tenant data missing in ${event._context.eventType} notification for ${event._context.objectType} ${locationDto.id}, cannot broadcast.`,
        );
        return;
      }
      await this.locationsBroadcaster.broadcastPatchLocation(
        tenant,
        locationDto,
      );
    } else {
      this._logger.info(
        `Location ${locationDto.id} updated but not published yet - use admin API to publish when ready`,
      );
    }
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.ChargingStation,
    'ChargingStationNotification',
  )
  async handleChargingStationUpdate(
    event: IDtoEvent<Partial<IChargingStationDto>>,
  ): Promise<void> {
    this._logger.debug(
      `Handling Charging Station Update: ${JSON.stringify(event)}`,
    );
    // Charging station updates are handled at the location level - no separate publishing
    this._logger.info(
      `Charging station ${event._payload.id} updated - changes will be published when location is re-published`,
    );
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.Evse,
    'EvseNotification',
  )
  async handleEvseInsert(event: IDtoEvent<IEvseDto>): Promise<void> {
    this._logger.debug(`Handling EVSE Insert: ${JSON.stringify(event)}`);
    // EVSEs are now published as part of the location hierarchy - no separate publishing
    this._logger.info(
      `EVSE ${event._payload.id} created but will be published as part of location hierarchy`,
    );
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Evse,
    'EvseNotification',
  )
  async handleEvseUpdate(event: IDtoEvent<Partial<IEvseDto>>): Promise<void> {
    this._logger.debug(`Handling EVSE Update: ${JSON.stringify(event)}`);
    const evseDto = event._payload;

    // Only allow PATCH updates if the EVSE has already been published
    if (evseDto.isPublished) {
      const tenant = evseDto.tenant;
      if (!tenant) {
        this._logger.error(
          `Tenant data missing in ${event._context.eventType} notification for ${event._context.objectType} ${evseDto.id}, cannot broadcast.`,
        );
        return;
      }

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
      evseDto.chargingStation = chargingStationResponse
        .ChargingStations[0] as IChargingStationDto;

      await this.locationsBroadcaster.broadcastPatchEvse(tenant, evseDto);
    } else {
      this._logger.info(
        `EVSE ${evseDto.id} updated but not published yet - use admin API to publish when ready`,
      );
    }
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.Connector,
    'ConnectorNotification',
  )
  async handleConnectorInsert(event: IDtoEvent<IConnectorDto>): Promise<void> {
    this._logger.debug(`Handling Connector Insert: ${JSON.stringify(event)}`);
    // Connectors are now published as part of the location hierarchy - no separate publishing
    this._logger.info(
      `Connector ${event._payload.id} created but will be published as part of location hierarchy`,
    );
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Connector,
    'ConnectorNotification',
  )
  async handleConnectorUpdate(
    event: IDtoEvent<Partial<IConnectorDto>>,
  ): Promise<void> {
    this._logger.debug(`Handling Connector Update: ${JSON.stringify(event)}`);
    const connectorDto = event._payload;

    // Only allow PATCH updates if the connector has already been published
    if (connectorDto.isPublished) {
      const tenant = connectorDto.tenant;
      if (!tenant) {
        this._logger.error(
          `Tenant data missing in ${event._context.eventType} notification for ${event._context.objectType} ${connectorDto.id}, cannot broadcast.`,
        );
        return;
      }

      const chargingStationResponse = await this.ocpiGraphqlClient.request<
        GetChargingStationByIdQueryResult,
        GetChargingStationByIdQueryVariables
      >(GET_CHARGING_STATION_BY_ID_QUERY, { id: connectorDto.stationId! });
      if (!chargingStationResponse.ChargingStations[0]) {
        this._logger.error(
          `Charging Station not found for ID ${connectorDto.stationId}, cannot broadcast.`,
        );
        return;
      }
      connectorDto.chargingStation = chargingStationResponse
        .ChargingStations[0] as IChargingStationDto;

      await this.locationsBroadcaster.broadcastPatchConnector(
        tenant,
        connectorDto,
      );
    } else {
      this._logger.info(
        `Connector ${connectorDto.id} updated but not published yet - use admin API to publish when ready`,
      );
    }
  }
}
