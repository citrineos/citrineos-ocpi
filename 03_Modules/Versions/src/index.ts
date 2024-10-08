// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { CacheWrapper, OcpiModule, ServerConfig } from '@citrineos/ocpi-base';
import { IMessageHandler, IMessageSender, SystemConfig } from '@citrineos/base';
import { Service } from 'typedi';
import { VersionsModuleApi } from './module/VersionsModuleApi';
import { VersionsOcppHandlers } from './module/VersionsOcppHandlers';
import { ILogObj, Logger } from 'tslog';

export { VersionsModuleApi } from './module/VersionsModuleApi';
export { VersionsOcppHandlers } from './module/VersionsOcppHandlers';
export { IVersionsModuleApi } from './module/IVersionsModuleApi';

@Service()
export class VersionsModule implements OcpiModule {
  handler!: IMessageHandler;
  sender!: IMessageSender;

  constructor(
    readonly config: ServerConfig,
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
