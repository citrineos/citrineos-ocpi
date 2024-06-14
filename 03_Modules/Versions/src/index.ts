// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0
import { OcpiModule } from '@citrineos/ocpi-base/dist/model/IOcpiModule';
import {
  OcpiCacheConfig,
  OcpiLogger,
  OcpiMessageHandlerConfig,
  OcpiMessageSenderConfig,
  OcpiServerConfig,
} from '@citrineos/ocpi-base';
import { SystemConfig } from '@citrineos/base';
import { Service } from 'typedi';
import { VersionsModuleApi } from './module/api';
import { VersionsOcppHandlers } from './module/handlers';

export { VersionsModuleApi } from './module/api';
export { VersionsOcppHandlers } from './module/handlers';
export { IVersionsModuleApi } from './module/interface';

@Service()
export class VersionsModule implements OcpiModule {
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

  public getController(): any {
    return VersionsModuleApi;
  }
}
