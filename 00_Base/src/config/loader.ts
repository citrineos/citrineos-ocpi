// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { OcpiConfig, OcpiConfigInput } from './ocpi.types';
import { loadOcpiConfig } from './defineOcpiConfig';
import { ILogObj, Logger } from 'tslog';

/**
 * Get OCPI system configuration with environment detection
 */
export function getOcpiSystemConfig(
  defaultConfig: OcpiConfigInput,
  logger?: Logger<ILogObj>,
): OcpiConfig {
  const config = defaultConfig;
  return loadOcpiConfig(config, logger);
}
