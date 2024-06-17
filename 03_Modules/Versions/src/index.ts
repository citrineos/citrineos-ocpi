// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { VersionsModuleApi } from './module/api';
import { IOcpiModule } from '@citrineos/ocpi-base';
import {
  EventGroup,
  ICache,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';

export { VersionsModuleApi } from './module/api';
export { VersionsOcppHandlers } from './module/handlers';
export { IVersionsModuleApi } from './module/interface';

import { VersionsOcppHandlers } from './module/handlers';

export class VersionsModule implements IOcpiModule {
  constructor(
    config: SystemConfig,
    cache: ICache,
    handler: IMessageHandler,
    sender: IMessageSender,
    eventGroup: EventGroup,
    logger?: Logger<ILogObj>,
  ) {
    new VersionsOcppHandlers(config, cache, sender, handler, logger);
  }

  getController(): any {
    return VersionsModuleApi;
  }
}
