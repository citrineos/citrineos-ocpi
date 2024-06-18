// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { CommandsModuleApi } from './module/api';
import {
  AbstractModule,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { Container, Service } from 'typedi';
import { CommandsOcppHandlers } from './module/handlers';
import { SequelizeTransactionEventRepository } from '@citrineos/data';

import {
  CacheWrapper,
  OcpiModule,
  OcpiServerConfig,
} from '@citrineos/ocpi-base';

export { CommandsModuleApi } from './module/api';
export { ICommandsModuleApi } from './module/interface';
export { CommandsOcppHandlers } from './module/handlers';

@Service()
export class CommandsModule implements OcpiModule {
  constructor(
    readonly config: OcpiServerConfig,
    readonly cache: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  init(handler?: IMessageHandler, sender?: IMessageSender): void {
    Container.set(
      AbstractModule,
      new CommandsOcppHandlers(
        this.config as SystemConfig,
        this.cache,
        handler,
        sender,
        Container.get(Logger),
      ),
    );

    Container.set(
      SequelizeTransactionEventRepository,
      new SequelizeTransactionEventRepository(
        Container.get(OcpiServerConfig) as SystemConfig,
        Container.get(Logger),
      ),
    );
  }

  getController(): any {
    return CommandsModuleApi;
  }
}
