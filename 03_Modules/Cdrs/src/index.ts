// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { CdrsModuleApi } from './module/CdrsModuleApi';
import { CacheWrapper, OcpiModule, ServerConfig } from '@citrineos/ocpi-base';
import { IMessageHandler, IMessageSender, SystemConfig } from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { Service } from 'typedi';
import { CdrsOcppHandlers } from './module/CdrsOcppHandlers';

export { CdrsModuleApi } from './module/CdrsModuleApi';
export { ICdrsModuleApi } from './module/ICdrsModuleApi';

@Service()
export class CdrsModule implements OcpiModule {
  handler!: IMessageHandler;
  sender!: IMessageSender;

  constructor(
    readonly config: ServerConfig,
    readonly cache: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  init(handler: IMessageHandler, sender: IMessageSender): void {
    this.handler = handler;
    this.sender = sender;
    new CdrsOcppHandlers(
      this.config as SystemConfig,
      this.cache.cache,
      this.sender,
      this.handler,
      this.logger,
    );
  }

  getController(): any {
    return CdrsModuleApi;
  }
}
