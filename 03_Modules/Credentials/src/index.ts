// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { IOcpiModule } from '@citrineos/ocpi-base';
import {
  EventGroup,
  ICache,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '../../../../citrineos-core/00_Base';
import { ILogObj, Logger } from 'tslog';
import { CommandsOcppHandlers } from '@citrineos/ocpi-commands/dist/module/handlers';

import { CredentialsModuleApi } from './module/api';

export { CredentialsModuleApi } from './module/api';
export { ICredentialsModuleApi } from './module/interface';
export { CredentialsOcppHandlers } from './module/handlers';

export class CredentialsModule implements IOcpiModule {
  constructor(
    config: SystemConfig,
    cache: ICache,
    handler: IMessageHandler,
    sender: IMessageSender,
    eventGroup: EventGroup,
    logger?: Logger<ILogObj>,
  ) {
    new CommandsOcppHandlers(config, cache, sender, handler, logger);
  }

  getController(): any {
    return CredentialsModuleApi;
  }
}
