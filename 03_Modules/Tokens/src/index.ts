// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { TokensModuleApi } from './module/TokensModuleApi';
import {
  CacheWrapper,
  OcpiConfig,
  OcpiConfigToken,
  OcpiModule,
} from '@citrineos/ocpi-base';
import { ILogObj, Logger } from 'tslog';
import { Inject, Service } from 'typedi';

export { TokensModuleApi } from './module/TokensModuleApi';
export { ITokensModuleApi } from './module/ITokensModuleApi';

@Service()
export class TokensModule implements OcpiModule {
  constructor(
    @Inject(OcpiConfigToken) config: OcpiConfig,
    readonly cacheWrapper: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  getController(): any {
    return TokensModuleApi;
  }
}
