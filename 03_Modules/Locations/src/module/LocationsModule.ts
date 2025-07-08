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
} from '@citrineos/ocpi-base';
import { SystemConfig } from '@citrineos/base';
import { Location, ChargingStation, Evse } from '@citrineos/data';
import { ILogObj, Logger } from 'tslog';

export class LocationsModule extends AbstractDtoModule {
  constructor(
    config: SystemConfig,
    receiver: IDtoEventReceiver,
    logger?: Logger<ILogObj>,
  ) {
    super(config, receiver, logger);
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
  async handleLocationInsert(event: IDtoEvent<Location>): Promise<void> {
    this._logger.info(`Handling Location Insert: ${JSON.stringify(event)}`);
    // Inserts are Location PUT requests
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Location,
    'LocationNotification',
  )
  async handleLocationUpdate(
    event: IDtoEvent<Partial<Location>>,
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
    event: IDtoEvent<Partial<ChargingStation>>,
  ): Promise<void> {
    this._logger.info(`Handling Charging Station Update: ${JSON.stringify(event)}`);
    // Updates are Location/Evse PATCH requests
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.Evse,
    'EvseNotification',
  )
  async handleEvseInsert(event: IDtoEvent<Evse>): Promise<void> {
    this._logger.info(`Handling EVSE Insert: ${JSON.stringify(event)}`);
    // Inserts are Location/Evse PUT requests
    // Requires pulling the ChargingStation data from GraphQL
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Evse,
    'EvseNotification',
  )
  async handleEvseUpdate(event: IDtoEvent<Partial<Evse>>): Promise<void> {
    this._logger.info(`Handling EVSE Update: ${JSON.stringify(event)}`);
    // Updates are Location/Evse PATCH requests
  }
  
  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.Connector,
    'ConnectorNotification',
  )
  async handleConnectorInsert(event: IDtoEvent<Connector>): Promise<void> {
    this._logger.info(`Handling Connector Insert: ${JSON.stringify(event)}`);
    // Inserts are Location/Evse/Connector PUT requests
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Connector,
    'ConnectorNotification',
  )
  async handleConnectorUpdate(event: IDtoEvent<Partial<Connector>>): Promise<void> {
    this._logger.info(`Handling Connector Update: ${JSON.stringify(event)}`);
    // Updates are Location/Evse/Connector PATCH requests
  }
}
