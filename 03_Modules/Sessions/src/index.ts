// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { SessionsModuleApi } from './module/SessionsModuleApi';
import { CacheWrapper, OcpiModule, OcpiConfig } from '@citrineos/ocpi-base';
import { IMessageHandler, IMessageSender, SystemConfig } from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { Service, Container } from 'typedi';
import { SessionsOcppHandlers } from './module/SessionsOcppHandlers';

export { SessionsModuleApi } from './module/SessionsModuleApi';
export { ISessionsModuleApi } from './module/ISessionsModuleApi';

@Service()
export class SessionsModule implements OcpiModule {
  handler!: IMessageHandler;
  sender!: IMessageSender;

  constructor(
    readonly config: OcpiConfig,
    readonly cache: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  init(handler: IMessageHandler, sender: IMessageSender): void {
    this.handler = handler;
    this.sender = sender;
    // Get the compatible ServerConfig from the container for legacy handlers
    const serverConfig = Container.get('ServerConfig');
    new SessionsOcppHandlers(
      serverConfig as SystemConfig,
      this.cache.cache,
      this.sender,
      this.handler,
      this.logger,
    );
  }

  getController(): any {
    return SessionsModuleApi;
  }
}
