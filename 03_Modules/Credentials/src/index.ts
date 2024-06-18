// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  CacheWrapper,
  OcpiModule,
  OcpiServerConfig,
} from '@citrineos/ocpi-base';
import { IMessageHandler, IMessageSender, SystemConfig } from '@citrineos/base';

import { CredentialsModuleApi } from './module/api';
import { Service } from 'typedi';
import { CredentialsOcppHandlers } from './module/handlers';
import { ILogObj, Logger } from 'tslog';

export { CredentialsOcppHandlers } from './module/handlers';
export { CredentialsModuleApi } from './module/api';
export { ICredentialsModuleApi } from './module/interface';

@Service()
export class CredentialsModule implements OcpiModule {
  handler!: IMessageHandler;
  sender!: IMessageSender;

  constructor(
    readonly config: OcpiServerConfig,
    readonly cache: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  getController(): any {
    return CredentialsModuleApi;
  }

  init(handler: IMessageHandler, sender: IMessageSender): void {
    this.handler = handler;
    this.sender = sender;
    new CredentialsOcppHandlers(
      this.config as SystemConfig,
      this.cache.cache,
      this.sender,
      this.handler,
      this.logger,
    );
  }
}
