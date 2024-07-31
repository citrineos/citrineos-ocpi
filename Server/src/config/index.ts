// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { localConfig } from './envs/local';
import { dockerConfig } from './envs/docker';
import { plainToClass, ServerConfig } from '@citrineos/ocpi-base';

function getConfig(): ServerConfig {
  let systemConfigPlain: any;
  switch (process.env.APP_ENV) {
    case 'local':
      systemConfigPlain = localConfig;
      break;
    case 'docker':
      systemConfigPlain = dockerConfig;
      break;
    default:
      throw new Error('Invalid APP_ENV "${process.env.APP_ENV}"');
  }
  return plainToClass(ServerConfig, systemConfigPlain, false);;
}

export const systemConfig: ServerConfig = getConfig();
