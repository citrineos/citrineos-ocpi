// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { OcpiConfig, OcpiConfigInput } from './ocpi.types';
import { loadOcpiConfig } from './defineOcpiConfig';
import { createLocalOcpiConfig } from './envs/local';
import { ILogObj, Logger } from 'tslog';

/**
 * Get default OCPI config based on environment
 */
function getDefaultOcpiConfig(): OcpiConfigInput {
  switch (process.env.APP_ENV) {
    case 'local':
      return createLocalOcpiConfig();
    case 'docker':
      // For docker environment, we fall back to local config
      // The docker-specific config should be provided by the Server
      return createLocalOcpiConfig();
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
