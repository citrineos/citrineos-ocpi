// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { createLocalConfig } from './envs/local';
import { createDockerConfig } from './envs/docker';
import { OcpiServerConfig, plainToClass } from '@citrineos/ocpi-base';
import { SystemConfig } from '@citrineos/base';

function getConfig(): OcpiServerConfig {
  let systemConfig: SystemConfig;
  switch (process.env.APP_ENV) {
    case 'local':
      systemConfig = createLocalConfig();
    case 'docker':
      systemConfig = createDockerConfig();
    default:
      throw new Error('Invalid APP_ENV "${process.env.APP_ENV}"');
  }
  return plainToClass(OcpiServerConfig, systemConfig);
}

export const systemConfig: OcpiServerConfig = getConfig();
