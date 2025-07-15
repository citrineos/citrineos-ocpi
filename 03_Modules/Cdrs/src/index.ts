// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { CdrsModuleApi } from './module/CdrsModuleApi';
import { CacheWrapper, OcpiModule, OcpiConfig } from '@citrineos/ocpi-base';
import { ILogObj, Logger } from 'tslog';
import { Service } from 'typedi';

export { CdrsModuleApi } from './module/CdrsModuleApi';
export { ICdrsModuleApi } from './module/ICdrsModuleApi';

// Cdr pushes are triggered by session updates in the Sessions module.
@Service()
export class CdrsModule implements OcpiModule {
  constructor(
    readonly config: OcpiConfig,
    readonly cache: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  getController(): any {
    return CdrsModuleApi;
  }
}
