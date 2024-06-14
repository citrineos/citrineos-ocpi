// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { VersionsModuleApi } from './module/api';
import {
  IOcpiModule,
  OcpiCacheConfig,
  OcpiLogger,
  OcpiMessageHandlerConfig,
  OcpiMessageSenderConfig,
  OcpiServerConfig,
} from '@citrineos/ocpi-base';
import { SystemConfig } from '../../../../citrineos-core/00_Base';
import { SystemConfig } from '@citrineos/base';
import { VersionsOcppHandlers } from './module/handlers';
import { Service } from 'typedi';

export { VersionsModuleApi } from './module/api';
export { VersionsOcppHandlers } from './module/handlers';
export { IVersionsModuleApi } from './module/interface';

@Service()
export class VersionsModule implements IOcpiModule {
  constructor(
    serverConfig: OcpiServerConfig,
    cacheConfig: OcpiCacheConfig,
    senderConfig: OcpiMessageSenderConfig,
    handlerConfig: OcpiMessageHandlerConfig,
    logger: OcpiLogger,
  ) {
    new VersionsOcppHandlers(
      serverConfig as SystemConfig,
      cacheConfig.cache,
      senderConfig.sender,
      handlerConfig.handler,
      logger,
    );
  }

  getController(): any {
    return VersionsModuleApi;
  }
}
