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
import { Container } from 'typedi';
import { IOcpiModule } from '@citrineos/ocpi-base';
import { LocationsOcppHandlers } from './handlers';
import { sequelize as sequelizeCore } from '@citrineos/data';
import { LocationsModuleApi } from './api';

useContainer(Container);

export class LocationsModule implements IOcpiModule {

  constructor(
    config: SystemConfig,
    cache: ICache,
    handler: IMessageHandler,
    sender: IMessageSender,
    logger?: Logger<ILogObj>,
  ) {

    Container.set(
      LocationsOcppHandlers,
      new LocationsOcppHandlers(
        config,
        cache,
        handler,
        sender,
        logger
      )
    );

    Container.set(
      sequelizeCore.SequelizeDeviceModelRepository,
      new sequelizeCore.SequelizeDeviceModelRepository(config, logger)
    );

    Container.set(
      sequelizeCore.SequelizeLocationRepository,
      new sequelizeCore.SequelizeLocationRepository(config, logger)
    );
  }

  getController(): any {
    return LocationsModuleApi;
  }
}
