// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  AbstractDtoModule,
  AsDtoEventHandler,
  DtoEventObjectType,
  DtoEventType,
  IDtoEvent,
  OcpiConfig,
  OcpiConfigToken,
  OcpiModule,
  RabbitMqDtoReceiver,
} from '@citrineos/ocpi-base';
import { ILogObj, Logger } from 'tslog';
import { LocationsModuleApi } from './module/LocationsModuleApi';
import {
  IChargingStationDto,
  IConnectorDto,
  IEvseDto,
  ILocationDto,
} from '@citrineos/base';
import { Inject, Service } from 'typedi';
import { LocationsBroadcaster } from '@citrineos/ocpi-base/dist/broadcaster/LocationsBroadcaster';

export { LocationsModuleApi } from './module/LocationsModuleApi';
export { ILocationsModuleApi } from './module/ILocationsModuleApi';

@Service()
export class LocationsModule extends AbstractDtoModule implements OcpiModule {
  constructor(
    @Inject(OcpiConfigToken) config: OcpiConfig,
    readonly logger: Logger<ILogObj>,
    readonly locationsBroadcaster: LocationsBroadcaster,
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
  async handleLocationInsert(event: IDtoEvent<ILocationDto>): Promise<void> {
    this._logger.info(`Handling Location Insert: ${JSON.stringify(event)}`);
    await this.locationsBroadcaster.broadcastPutLocation(event._payload);
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Location,
    'LocationNotification',
  )
  async handleLocationUpdate(
    event: IDtoEvent<Partial<ILocationDto>>,
  ): Promise<void> {
    this._logger.info(`Handling Location Update: ${JSON.stringify(event)}`);
    await this.locationsBroadcaster.broadcastPatchLocation(event._payload);
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.ChargingStation,
    'ChargingStationNotification',
  )
  async handleChargingStationUpdate(
    event: IDtoEvent<Partial<IChargingStationDto>>,
  ): Promise<void> {
    this._logger.info(
      `Handling Charging Station Update: ${JSON.stringify(event)}`,
    );
    // Updates are Location/Evse PATCH requests
    // await this.locationsBroadcaster.broadcastPatchEvse(event._payload); // todo
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.Evse,
    'EvseNotification',
  )
  async handleEvseInsert(event: IDtoEvent<IEvseDto>): Promise<void> {
    this._logger.info(`Handling EVSE Insert: ${JSON.stringify(event)}`);
    // Inserts are Location/Evse PUT requests
    // Requires pulling the ChargingStation data from GraphQL
    await this.locationsBroadcaster.broadcastPutEvse(event._payload);
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Evse,
    'EvseNotification',
  )
  async handleEvseUpdate(event: IDtoEvent<Partial<IEvseDto>>): Promise<void> {
    this._logger.info(`Handling EVSE Update: ${JSON.stringify(event)}`);
    // Updates are Location/Evse PATCH requests
    await this.locationsBroadcaster.broadcastPatchEvse(event._payload);
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.Connector,
    'ConnectorNotification',
  )
  async handleConnectorInsert(event: IDtoEvent<IConnectorDto>): Promise<void> {
    this._logger.info(`Handling Connector Insert: ${JSON.stringify(event)}`);
    // Inserts are Location/Evse/Connector PUT requests
    await this.locationsBroadcaster.broadcastPutConnector(event._payload);
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Connector,
    'ConnectorNotification',
  )
  async handleConnectorUpdate(
    event: IDtoEvent<Partial<IConnectorDto>>,
  ): Promise<void> {
    this._logger.info(`Handling Connector Update: ${JSON.stringify(event)}`);
    // Updates are Location/Evse/Connector PATCH requests
    await this.locationsBroadcaster.broadcastPatchConnector(event._payload);
  }
}
