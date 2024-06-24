// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  ICache,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { useContainer } from 'routing-controllers';
import { Container, Service } from 'typedi';
import { OcpiModule, LocationsClientApi, LocationsService } from '@citrineos/ocpi-base';
import { LocationsHandlers } from './handlers';
import { sequelize as sequelizeCore } from '@citrineos/data';
import { LocationsModuleApi } from './api';

useContainer(Container);

@Service()
export class LocationsModule implements OcpiModule {
  handler!: IMessageHandler;
  sender!: IMessageSender;

  constructor(
    readonly config: SystemConfig,
    readonly cache: ICache,
    readonly logger?: Logger<ILogObj>,
  ) { }

  init(handler: IMessageHandler, sender: IMessageSender): void {
    this.handler = handler;
    this.sender = sender;

    Container.set(
      sequelizeCore.SequelizeDeviceModelRepository,
      new sequelizeCore.SequelizeDeviceModelRepository(this.config, this.logger)
    );

    Container.set(
      sequelizeCore.SequelizeLocationRepository,
      new sequelizeCore.SequelizeLocationRepository(this.config, this.logger)
    );

    new LocationsHandlers(
      this.config as SystemConfig,
      this.cache,
      Container.get(LocationsService),
      Container.get(LocationsClientApi),
      this.handler,
      this.sender,
      this.logger,
    );
  }

  getController(): any {
    return LocationsModuleApi;
  }
}
