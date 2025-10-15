// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { CdrsModuleApi } from './module/CdrsModuleApi';
import {
  CacheWrapper,
  OcpiConfig,
  OcpiConfigToken,
  OcpiModule,
} from '@citrineos/ocpi-base';
import { ILogObj, Logger } from 'tslog';
import { Inject, Service } from 'typedi';

export { CdrsModuleApi } from './module/CdrsModuleApi';
export { ICdrsModuleApi } from './module/ICdrsModuleApi';

// Cdr pushes are triggered by session updates in the Sessions module.
@Service()
export class CdrsModule implements OcpiModule {
  constructor(
    @Inject(OcpiConfigToken) config: OcpiConfig,
    readonly cache: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  getController(): any {
    return CdrsModuleApi;
  }
}
