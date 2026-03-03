// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { ChargingProfilesModuleApi } from './module/ChargingProfilesModuleApi.js';
import type { OcpiConfig } from '@citrineos/ocpi-base';
import {
  CacheWrapper,
  OcpiConfigToken,
  OcpiModule,
} from '@citrineos/ocpi-base';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import { Container, Inject, Service } from 'typedi';
import { useContainer } from 'routing-controllers';

useContainer(Container);

@Service()
export class ChargingProfilesModule implements OcpiModule {
  constructor(
    @Inject(OcpiConfigToken) config: OcpiConfig,
    readonly cache: CacheWrapper,
    readonly logger?: Logger<ILogObj>,
  ) {}

  getController(): any {
    return ChargingProfilesModuleApi;
  }
}
