// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0
import {
  CacheWrapper,
  MessageHandlerWrapper,
  MessageSenderWrapper,
  OcpiModule,
  OcpiServerConfig,
} from '@citrineos/ocpi-base';
import {SystemConfig} from '@citrineos/base';
import {Service} from 'typedi';
import {VersionsModuleApi} from './module/api';
import {VersionsOcppHandlers} from './module/handlers';
import {ILogObj, Logger} from 'tslog';

export {VersionsModuleApi} from './module/api';
export {VersionsOcppHandlers} from './module/handlers';
export {IVersionsModuleApi} from './module/interface';

@Service()
export class VersionsModule extends OcpiModule {
  constructor(
    config: OcpiServerConfig,
    cache: CacheWrapper,
    senderWrapper: MessageSenderWrapper,
    handlerWrapper: MessageHandlerWrapper,
    logger?: Logger<ILogObj>,
  ) {
    super();
    new VersionsOcppHandlers(
      config as SystemConfig,
      cache.cache,
      senderWrapper.sender,
      handlerWrapper.handler,
      logger,
    );
  }

  getController(): any {
    return VersionsModuleApi;
  }
}
