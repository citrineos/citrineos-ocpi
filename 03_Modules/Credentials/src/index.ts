// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  IOcpiModule,
  OcpiCacheConfig,
  OcpiLogger,
  OcpiMessageHandlerConfig,
  OcpiMessageSenderConfig,
  OcpiServerConfig,
} from '@citrineos/ocpi-base';
import { SystemConfig } from '../../../../citrineos-core/00_Base';
import { CommandsOcppHandlers } from '@citrineos/ocpi-commands/dist/module/handlers';

import { CredentialsModuleApi } from './module/api';
import { Service } from 'typedi';

export { CredentialsModuleApi } from './module/api';
export { ICredentialsModuleApi } from './module/interface';
export { CredentialsOcppHandlers } from './module/handlers';

@Service()
export class CredentialsModule implements IOcpiModule {
  constructor(
    serverConfig: OcpiServerConfig,
    cacheConfig: OcpiCacheConfig,
    senderConfig: OcpiMessageSenderConfig,
    handlerConfig: OcpiMessageHandlerConfig,
    logger: OcpiLogger,
  ) {
    new CommandsOcppHandlers(
      serverConfig as SystemConfig,
      cacheConfig.cache,
      senderConfig.sender,
      handlerConfig.handler,
      logger,
    );
  }

  getController(): any {
    return CredentialsModuleApi;
  }
}
