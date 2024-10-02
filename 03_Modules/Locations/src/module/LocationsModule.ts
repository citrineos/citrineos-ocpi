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
import {
  LocationsBroadcaster,
  LocationsDatasource,
  OcpiModule,
} from '@citrineos/ocpi-base';
import { LocationsHandlers } from './LocationsHandlers';
import { LocationsModuleApi } from './LocationsModuleApi';

useContainer(Container);

@Service()
export class LocationsModule implements OcpiModule {
  handler!: IMessageHandler;
  sender!: IMessageSender;

  constructor(
    readonly config: SystemConfig,
    readonly cache: ICache,
    readonly logger?: Logger<ILogObj>,
  ) {}

  init(handler: IMessageHandler, sender: IMessageSender): void {
    this.handler = handler;
    this.sender = sender;

    new LocationsHandlers(
      this.config as SystemConfig,
      this.cache,
      Container.get(LocationsBroadcaster),
      Container.get(LocationsDatasource),
      this.handler,
      this.sender,
      this.logger,
    );
  }

  getController(): any {
    return LocationsModuleApi;
  }
}
