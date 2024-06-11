// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { SystemConfig } from '@citrineos/base';
import { createLocalConfig } from './envs/local';

function getConfig() {
  switch (process.env.APP_ENV) {
    case 'local':
      return createLocalConfig();
    default:
      throw new Error('Invalid APP_ENV "${process.env.APP_ENV}"');
  }
}

export const systemConfig: SystemConfig = getConfig();
