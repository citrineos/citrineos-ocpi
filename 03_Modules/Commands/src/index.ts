// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0
import { Service } from 'typedi';

import { CommandsModuleApi } from './module/CommandsModuleApi';
import { CacheWrapper, OcpiModule, OcpiConfig } from '@citrineos/ocpi-base';
import { ILogObj, Logger } from 'tslog';

export { CommandsModuleApi } from './module/CommandsModuleApi';
export { ICommandsModuleApi } from './module/ICommandsModuleApi';

@Service()
export class CommandsModule implements OcpiModule {
  constructor(
    readonly config: OcpiConfig,
    readonly cacheWrapper: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  getController(): any {
    return CommandsModuleApi;
  }
}
