// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import {
  CacheWrapper,
  OcpiConfig,
  OcpiConfigToken,
  OcpiModule,
} from '@citrineos/ocpi-base';
import { Inject, Service } from 'typedi';
import { VersionsModuleApi } from './module/VersionsModuleApi';
import { ILogObj, Logger } from 'tslog';

export { VersionsModuleApi } from './module/VersionsModuleApi';
export { IVersionsModuleApi } from './module/IVersionsModuleApi';

@Service()
export class VersionsModule implements OcpiModule {
  constructor(
    @Inject(OcpiConfigToken) readonly config: OcpiConfig,
    readonly cacheWrapper: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  public getController(): any {
    return VersionsModuleApi;
  }
}
