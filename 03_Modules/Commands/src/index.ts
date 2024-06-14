// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { OcpiModule } from '@citrineos/ocpi-base/dist/model/IOcpiModule';
import { CommandsModuleApi } from './module/api';
import {
  EventGroup,
  ICache,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { Container, Service } from 'typedi';
import { CommandsOcppHandlers } from './module/handlers';
import { useContainer } from 'routing-controllers';

export { CommandsModuleApi } from './module/api';
export { ICommandsModuleApi } from './module/interface';
export { CommandsOcppHandlers } from './module/handlers';

useContainer(Container);

@Service()
export class CommandsModule implements OcpiModule {
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

  public getController(): any {
    return CommandsModuleApi;
  }
}
