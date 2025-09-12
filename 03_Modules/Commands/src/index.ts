// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Inject, Service } from 'typedi';

import { CommandsModuleApi } from './module/CommandsModuleApi';
import {
  CacheWrapper,
  OcpiConfig,
  OcpiConfigToken,
  OcpiModule,
} from '@citrineos/ocpi-base';
import { ILogObj, Logger } from 'tslog';

export { CommandsModuleApi } from './module/CommandsModuleApi';
export { ICommandsModuleApi } from './module/ICommandsModuleApi';

@Service()
export class CommandsModule implements OcpiModule {
  constructor(
    @Inject(OcpiConfigToken) readonly config: OcpiConfig,
    readonly cacheWrapper: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  getController(): any {
    return CommandsModuleApi;
  }
}
