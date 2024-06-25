// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0
import { CommandsModuleApi } from './module/api';
import {
  CacheWrapper,
  OcpiModule,
  OcpiServerConfig,
} from '@citrineos/ocpi-base';
import {
  AbstractModule,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { Container, Service } from 'typedi';
import { useContainer } from 'routing-controllers';

export { CommandsModuleApi } from './module/api';
export { ICommandsModuleApi } from './module/interface';

useContainer(Container);

@Service()
export class CommandsModule implements OcpiModule {
  constructor(
    readonly config: OcpiServerConfig,
    readonly cache: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  init(handler?: IMessageHandler, sender?: IMessageSender): void {

  }

  getController(): any {
    return CommandsModuleApi;
  }
}
