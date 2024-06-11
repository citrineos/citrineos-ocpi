// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {CommandsModuleApi} from "./module/api";
import {IOcpiModule} from '@citrineos/ocpi-base';
import {EventGroup, ICache, IMessageHandler, IMessageSender, SystemConfig} from "../../../../citrineos-core/00_Base";
import {ILogObj, Logger} from "tslog";
import {Container} from 'typedi';
import {CommandsOcppHandlers} from './module/handlers';
import {useContainer} from 'routing-controllers';

export {CommandsModuleApi} from './module/api';
export {ICommandsModuleApi} from './module/interface';


useContainer(Container);

export class CommandsModule implements IOcpiModule {

  constructor(
    config: SystemConfig,
    cache: ICache,
    handler: IMessageHandler,
    sender: IMessageSender,
    eventGroup: EventGroup,
    logger?: Logger<ILogObj>,
  ) {
    new CommandsOcppHandlers(
      config,
      cache,
      sender,
      handler,
      logger
    );
  }

  getController(): any {
    return CommandsModuleApi
  }
}
