// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

/**
 * Simple Config Bridge for OCPI
 * This creates a minimal ServerConfig from OcpiConfig for compatibility
 * This bridge is temporary until citrineos-ocpi becomes fully independent
 */
import { SystemConfig } from '@citrineos/base';
import { Env } from '../config/ServerConfig';

/**
 * Creates a minimal ServerConfig from OcpiConfig
 * Only includes the essential fields needed for OCPI server operation
 */
export function createServerConfigFromOcpiConfig(
  ocpiConfig: any,
): SystemConfig {
  return {
    userPreferences: {},
    maxReconnectDelay: ocpiConfig.maxReconnectDelay || 30,

    env: ocpiConfig.env === 'development' ? Env.DEVELOPMENT : Env.PRODUCTION,
    logLevel: ocpiConfig.logLevel,
    ocpiServer: ocpiConfig.ocpiServer,

    // Create a fake centralSystem for compatibility (OCPI doesn't need this)
    centralSystem: {
      host: ocpiConfig.ocpiServer.host,
      port: ocpiConfig.ocpiServer.port,
    },

    // Map util configuration from new structure
    util: {
      cache: ocpiConfig.cache,
      messageBroker: ocpiConfig.messageBroker || { amqp: false },
      swagger: ocpiConfig.swagger,
      networkConnection: { websocketServers: [] },
    } as any,

    // Map modules - use empty defaults since OCPI has its own module system
    modules: {} as any,

    // Add missing required fields with defaults
    maxCallLengthSeconds: 30,
    maxCachingSeconds: 300,
  };
}
