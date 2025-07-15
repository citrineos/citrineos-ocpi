// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ChargingProfilesModuleApi } from './module/ChargingProfilesModuleApi';
import { CacheWrapper, OcpiModule, OcpiConfig } from '@citrineos/ocpi-base';
import { ILogObj, Logger } from 'tslog';
import { Container, Service } from 'typedi';
import { useContainer } from 'routing-controllers';

useContainer(Container);

@Service()
export class ChargingProfilesModule implements OcpiModule {
  constructor(
    readonly config: OcpiConfig,
    readonly cache: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  getController(): any {
    return ChargingProfilesModuleApi;
  }
}
