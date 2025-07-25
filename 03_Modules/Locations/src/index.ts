// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  AbstractDtoModule,
  AdminLocationsService,
  AsDtoEventHandler,
  DtoEventObjectType,
  DtoEventType,
  IDtoEvent,
  IDtoEventReceiver,
  LocationsService,
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
    private readonly _locationsService: LocationsService,
    private readonly _adminLocationsService: AdminLocationsService,
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
    const locationResponse = await this._locationsService.getLocationById(
      event.data.id,
    );
    const locationDto = locationResponse.data
      ? { ...locationResponse.data, ...event.data }
      : event.data;
    await this._adminLocationsService.createOrUpdateLocation(locationDto, true);
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
    if (!event.data.id) {
      this._logger.error('Location update event does not contain an id.');
      return;
    }
    const locationResponse = await this._locationsService.getLocationById(
      event.data.id,
    );
    if (locationResponse.data) {
      const patchedLocation = {
        ...locationResponse.data,
        ...event.data,
      } as ILocationDto;
      await this._adminLocationsService.createOrUpdateLocation(
        patchedLocation,
        true,
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
    this._logger.info(
      `Handling Charging Station Update: ${JSON.stringify(event)}`,
    );
    // Updates are Location/Evse PATCH requests
    if (event.data.locationId) {
      const locationResponse = await this._locationsService.getLocationById(
        event.data.locationId,
      );
      if (locationResponse.data) {
        const patchedLocation = {
          ...locationResponse.data,
          ...event.data,
        } as ILocationDto;
        await this._adminLocationsService.createOrUpdateLocation(
          patchedLocation,
          true,
        );
      }
    }
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
    if (event.data.chargingStationId) {
      const location = await this._locationsService.getLocationByStationId(
        event.data.chargingStationId,
      );
      if (location) {
        await this._adminLocationsService.createOrUpdateLocation(
          location,
          true,
        );
      }
    }
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Evse,
    'EvseNotification',
  )
  async handleEvseUpdate(event: IDtoEvent<Partial<IEvseDto>>): Promise<void> {
    this._logger.info(`Handling EVSE Update: ${JSON.stringify(event)}`);
    // Updates are Location/Evse PATCH requests
    if (event.data.id) {
      const location = await this._locationsService.getLocationByEvseId(
        event.data.id,
      );
      if (location) {
        await this._adminLocationsService.createOrUpdateLocation(
          location,
          true,
        );
      }
    }
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.Connector,
    'ConnectorNotification',
  )
  async handleConnectorInsert(event: IDtoEvent<IConnectorDto>): Promise<void> {
    this._logger.info(`Handling Connector Insert: ${JSON.stringify(event)}`);
    // Inserts are Location/Evse/Connector PUT requests
    if (event.data.evseId) {
      const location = await this._locationsService.getLocationByEvseId(
        event.data.evseId,
      );
      if (location) {
        await this._adminLocationsService.createOrUpdateLocation(
          location,
          true,
        );
      }
    }
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
    if (event.data.id) {
      const location = await this._locationsService.getLocationByConnectorId(
        event.data.id,
      );
      if (location) {
        await this._adminLocationsService.createOrUpdateLocation(
          location,
          true,
        );
      }
    }
  }
}
