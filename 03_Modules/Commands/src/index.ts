// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {CommandsModuleApi} from './module/api';
import {SystemConfig,} from '@citrineos/base';
import {ILogObj, Logger} from 'tslog';
import {Service} from 'typedi';
import {CommandsOcppHandlers} from './module/handlers';
import {
  CacheWrapper,
  MessageHandlerWrapper,
  MessageSenderWrapper,
  OcpiModule,
  OcpiServerConfig,
} from '@citrineos/ocpi-base';

export {CommandsModuleApi} from './module/api';
export {ICommandsModuleApi} from './module/interface';
export {CommandsOcppHandlers} from './module/handlers';


@Service()
export class CommandsModule extends OcpiModule {
  constructor(
    config: OcpiServerConfig,
    cache: CacheWrapper,
    senderWrapper: MessageSenderWrapper,
    handlerWrapper: MessageHandlerWrapper,
    logger?: Logger<ILogObj>,
  ) {
    super();
    new CommandsOcppHandlers(
      config as SystemConfig,
      cache.cache,
      senderWrapper.sender,
      handlerWrapper.handler,
      logger,
    );
  }

  getController(): any {
    return CommandsModuleApi;
  }
}
