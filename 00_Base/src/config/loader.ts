// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { OcpiConfig, OcpiConfigInput } from './ocpi.types';
import { loadOcpiConfig } from './defineOcpiConfig';
import { createLocalOcpiConfig } from './envs/local';
import { createDockerOcpiConfig } from './envs/docker';
import { ILogObj, Logger } from 'tslog';

/**
 * Get default OCPI config based on environment
 */
function getDefaultOcpiConfig(): OcpiConfigInput {
  switch (process.env.APP_ENV) {
    case 'local':
      return createLocalOcpiConfig();
    case 'docker':
      return createDockerOcpiConfig();
    default:
      return createLocalOcpiConfig();
  }
}

/**
 * Get OCPI system configuration with environment detection
 */
export function getOcpiSystemConfig(
  defaultConfig?: OcpiConfigInput,
  logger?: Logger<ILogObj>,
): OcpiConfig {
  const config = defaultConfig || getDefaultOcpiConfig();
  return loadOcpiConfig(config, logger);
}
