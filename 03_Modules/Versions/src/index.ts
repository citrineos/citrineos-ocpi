// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { VersionsModuleApi } from './module/api';
import {
  CacheWrapper,
  CommandsClientApi,
  OcpiModule,
  OcpiServerConfig,
  ResponseUrlRepository,
} from '@citrineos/ocpi-base';
import { SystemConfig } from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { VersionsOcppHandlers } from './module/handlers';
import { Service } from 'typedi';
import { IMessageHandler, IMessageSender } from '@citrineos/base';

export { VersionsModuleApi } from './module/api';
export { VersionsOcppHandlers } from './module/handlers';
export { IVersionsModuleApi } from './module/interface';

@Service()
export class VersionsModule implements OcpiModule {
  constructor(
    readonly config: OcpiServerConfig,
    readonly cache: CacheWrapper,
    readonly responseUrlRepo: ResponseUrlRepository,
    readonly commandsClient: CommandsClientApi,
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
