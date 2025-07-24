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
  IDtoEventReceiver,
  OcpiConfig,
  OcpiModule,
} from '@citrineos/ocpi-base';
import { ILogObj, Logger } from 'tslog';
import { LocationsModuleApi } from './module/LocationsModuleApi';
import {
  IChargingStationDto,
  IConnectorDto,
  IEvseDto,
  ILocationDto,
} from '@citrineos/base';
import { Service } from 'typedi';

export { LocationsModuleApi } from './module/LocationsModuleApi';
export { ILocationsModuleApi } from './module/ILocationsModuleApi';

@Service()
export class LocationsModule extends AbstractDtoModule implements OcpiModule {
  constructor(
    config: OcpiConfig,
    receiver: IDtoEventReceiver,
    logger?: Logger<ILogObj>,
  ) {
    super(config, receiver, logger);
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
    // Inserts are Location PUT requests
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
    // Updates are Location PATCH requests
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
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Evse,
    'EvseNotification',
  )
  async handleEvseUpdate(event: IDtoEvent<Partial<IEvseDto>>): Promise<void> {
    this._logger.info(`Handling EVSE Update: ${JSON.stringify(event)}`);
    // Updates are Location/Evse PATCH requests
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.Connector,
    'ConnectorNotification',
  )
  async handleConnectorInsert(event: IDtoEvent<IConnectorDto>): Promise<void> {
    this._logger.info(`Handling Connector Insert: ${JSON.stringify(event)}`);
    // Inserts are Location/Evse/Connector PUT requests
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
  }
}
