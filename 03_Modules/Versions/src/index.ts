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
  constructor(
    readonly config: OcpiServerConfig,
    readonly cache: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  init(handler?: IMessageHandler, sender?: IMessageSender): void {
    new VersionsOcppHandlers(
      this.config as SystemConfig,
      this.cache.cache,
      handler,
      sender,
      this.logger,
    );
  }

  getController(): any {
    return VersionsModuleApi;
  }
}
