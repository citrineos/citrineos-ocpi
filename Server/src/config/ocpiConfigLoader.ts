// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ILogObj, Logger } from 'tslog';
import {
  OcpiConfig,
  ocpiConfigSchema,
} from '@citrineos/ocpi-base/dist/config/types';
import { sampleOcpiConfig } from './sampleOcpiConfig';

// Simple config store interface for OCPI
interface OcpiConfigStore {
  fetchConfig(): Promise<OcpiConfig | null>;
  saveConfig(config: OcpiConfig): Promise<void>;
}

// Simple file-based config store
class OcpiFileConfigStore implements OcpiConfigStore {
  private _logger: Logger<ILogObj>;

  constructor(logger?: Logger<ILogObj>) {
    this._logger =
      logger || new Logger<ILogObj>({ name: 'OcpiFileConfigStore' });
  }

  async fetchConfig(): Promise<OcpiConfig | null> {
    // For now, return the sample config
    // In production, this would read from a file or environment
    this._logger.info('Using sample OCPI configuration');
    return sampleOcpiConfig;
  }

  async saveConfig(config: OcpiConfig): Promise<void> {
    // For now, just log the config
    // In production, this would save to a file
    this._logger.info('OCPI configuration would be saved:', config);
  }
}

// Config store factory
class OcpiConfigStoreFactory {
  private static instance: OcpiConfigStore | null = null;

  static setConfigStore(configStorage: OcpiConfigStore): OcpiConfigStore {
    if (this.instance === null) {
      this.instance = configStorage;
    } else {
      console.warn('OcpiConfigStore has already been initialized.');
    }
    return this.instance;
  }

  static getInstance(): OcpiConfigStore {
    if (this.instance === null) {
      // Use default file-based store if none set
      this.instance = new OcpiFileConfigStore();
    }
    return this.instance;
  }
}

/**
 * Load OCPI configuration with environment variable overrides
 */
export async function loadOcpiConfig(
  logger?: Logger<ILogObj>,
): Promise<OcpiConfig> {
  const configStore = OcpiConfigStoreFactory.getInstance();
  let config = await configStore.fetchConfig();

  if (!config) {
    // Fallback to sample config
    config = sampleOcpiConfig;
    logger?.warn('No configuration found, using sample configuration');
  }

  // Apply environment variable overrides
  config = applyEnvironmentOverrides(config);

  // Validate the final configuration
  return ocpiConfigSchema.parse(config);
}

/**
 * Apply environment variable overrides to configuration
 */
function applyEnvironmentOverrides(config: OcpiConfig): OcpiConfig {
  const overriddenConfig = { ...config };

  // Environment variable mapping
  const envMappings = {
    OCPI_ENV: 'env',
    OCPI_LOG_LEVEL: 'logLevel',
    OCPI_SERVER_HOST: 'ocpiServer.host',
    OCPI_SERVER_PORT: 'ocpiServer.port',
    OCPI_CENTRAL_SYSTEM_HOST: 'centralSystem.host',
    OCPI_CENTRAL_SYSTEM_PORT: 'centralSystem.port',
    OCPI_CACHE_MEMORY: 'util.cache.memory',
    OCPI_REDIS_HOST: 'util.cache.redis.host',
    OCPI_REDIS_PORT: 'util.cache.redis.port',
    OCPI_REDIS_PASSWORD: 'util.cache.redis.password',
    OCPI_REDIS_DATABASE: 'util.cache.redis.database',
    OCPI_AMQP_URL: 'util.messageBroker.amqp.url',
    OCPI_AMQP_EXCHANGE: 'util.messageBroker.amqp.exchange',
    OCPI_AMQP_ROUTING_KEY: 'util.messageBroker.amqp.routingKey',
    OCPI_AUTH_LOCAL_BYPASS: 'util.authProvider.localByPass',
    OCPI_PARTY_COUNTRY_CODE: 'ocpi.party.countryCode',
    OCPI_PARTY_ID: 'ocpi.party.partyId',
    OCPI_PARTY_ROLE: 'ocpi.party.role',
    OCPI_PARTY_NAME: 'ocpi.party.businessDetails.name',
    OCPI_PARTY_WEBSITE: 'ocpi.party.businessDetails.website',
    OCPI_PARTY_LOGO: 'ocpi.party.businessDetails.logo',
  };

  // Apply overrides
  for (const [envVar, configPath] of Object.entries(envMappings)) {
    const envValue = process.env[envVar];
    if (envValue !== undefined) {
      setNestedValue(overriddenConfig, configPath, parseEnvValue(envValue));
    }
  }

  return overriddenConfig;
}

/**
 * Set a nested value in an object using dot notation
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Parse environment variable value to appropriate type
 */
function parseEnvValue(value: string): any {
  // Boolean values
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;

  // Number values
  if (!isNaN(Number(value))) return Number(value);

  // String values
  return value;
}

export { OcpiConfigStore, OcpiConfigStoreFactory, OcpiFileConfigStore };
