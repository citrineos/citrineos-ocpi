// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ILogObj, Logger } from 'tslog';
import { loadOcpiConfig } from './ocpiConfigLoader';
import { OcpiConfig } from '@citrineos/ocpi-base/dist/config/types';

// Initialize logger for configuration loading
const configLogger = new Logger<ILogObj>({ name: 'OcpiConfigLoader' });

// Load and export the system configuration
let systemConfig: OcpiConfig | null = null;

export async function getSystemConfig(): Promise<OcpiConfig> {
  if (!systemConfig) {
    systemConfig = await loadOcpiConfig(configLogger);
    configLogger.info('OCPI configuration loaded successfully');
  }
  return systemConfig;
}

// For backward compatibility - load config synchronously on module import
// This is a temporary solution until the server is updated to use async config loading
export const initializeConfig = async (): Promise<OcpiConfig> => {
  const config = await getSystemConfig();
  console.debug('Loading OCPI config', config);
  return config;
};

// Export types and utilities
export { ocpiConfigSchema } from '@citrineos/ocpi-base/dist/config/types';
export { sampleOcpiConfig } from './sampleOcpiConfig';
export {
  loadOcpiConfig,
  OcpiConfigStore,
  OcpiConfigStoreFactory,
} from './ocpiConfigLoader';
