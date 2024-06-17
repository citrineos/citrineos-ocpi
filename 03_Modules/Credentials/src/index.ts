// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  OcpiCacheConfig,
  OcpiLogger,
  OcpiMessageHandlerConfig,
  OcpiMessageSenderConfig,
  OcpiModule,
  OcpiServerConfig,
} from '@citrineos/ocpi-base';
import {SystemConfig} from '@citrineos/base';
import {CommandsOcppHandlers} from '@citrineos/ocpi-commands';

import {CredentialsModuleApi} from './module/api';
import {Service} from 'typedi';

export {CredentialsOcppHandlers} from './module/handlers';
export {CredentialsModuleApi} from './module/api';
export {ICredentialsModuleApi} from './module/interface';

@Service()
export class CredentialsModule implements OcpiModule {
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
