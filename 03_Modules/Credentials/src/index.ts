// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import {
  CacheWrapper,
  OcpiConfig,
  OcpiConfigToken,
  OcpiModule,
} from '@citrineos/ocpi-base';

import { CredentialsModuleApi } from './module/CredentialsModuleApi';
import { Inject, Service } from 'typedi';
import { ILogObj, Logger } from 'tslog';

export { CredentialsModuleApi } from './module/CredentialsModuleApi';
export { ICredentialsModuleApi } from './module/ICredentialsModuleApi';

@Service()
export class CredentialsModule implements OcpiModule {
  constructor(
    @Inject(OcpiConfigToken) readonly config: OcpiConfig,
    readonly cacheWrapper: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  getController(): any {
    return CredentialsModuleApi;
  }
}
