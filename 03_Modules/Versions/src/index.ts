// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { OcpiModule } from '@citrineos/ocpi-base';
import {
  ICache,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '@citrineos/base';
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
    config: SystemConfig,
    cache: ICache,
    handler: IMessageHandler,
    sender: IMessageSender,
    logger?: Logger<ILogObj>,
  ) {
    new VersionsOcppHandlers(config, cache, sender, handler, logger);
  }

  public getController(): any {
    return VersionsModuleApi;
  }
}
