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
import { Service } from 'typedi';
import { VersionsModuleApi } from './module/api';
import { VersionsOcppHandlers } from './module/handlers';
import { ILogObj, Logger } from 'tslog';

export { VersionsModuleApi } from './module/api';
export { VersionsOcppHandlers } from './module/handlers';
export { IVersionsModuleApi } from './module/interface';

@Service()
export class VersionsModule implements OcpiModule {
  handler!: IMessageHandler;
  sender!: IMessageSender;

  constructor(
    readonly config: OcpiServerConfig,
    readonly cacheWrapper: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  init(handler: IMessageHandler, sender: IMessageSender): void {
    this.handler = handler;
    this.sender = sender;
    new VersionsOcppHandlers(
      this.config as SystemConfig,
      this.cacheWrapper.cache,
      this.handler,
      this.sender,
      this.logger,
    );
  }

  public getController(): any {
    return VersionsModuleApi;
  }
}
