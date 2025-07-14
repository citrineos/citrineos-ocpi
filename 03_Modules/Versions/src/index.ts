// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { CacheWrapper, OcpiModule, OcpiConfig } from '@citrineos/ocpi-base';
import { IMessageHandler, IMessageSender, SystemConfig } from '@citrineos/base';
import { Service, Container } from 'typedi';
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
    readonly config: OcpiConfig,
    readonly cacheWrapper: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  init(handler: IMessageHandler, sender: IMessageSender): void {
    this.handler = handler;
    this.sender = sender;
    // Get the compatible ServerConfig from the container for legacy handlers
    const serverConfig = Container.get('ServerConfig');
    new VersionsOcppHandlers(
      serverConfig as SystemConfig,
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
