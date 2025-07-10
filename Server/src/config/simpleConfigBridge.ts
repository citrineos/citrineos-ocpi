// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

/**
 * Simple Config Bridge for OCPI
 * This creates a minimal ServerConfig from OcpiConfig for compatibility
 * This bridge is temporary until citrineos-ocpi becomes fully independent
 */

import { ServerConfig, Env } from '@citrineos/ocpi-base';

/**
 * Creates a minimal ServerConfig from OcpiConfig
 * Only includes the essential fields needed for OCPI server operation
 */
export function createServerConfigFromOcpiConfig(
  ocpiConfig: any,
): ServerConfig {
  const serverConfig: ServerConfig = {
    env: ocpiConfig.env === 'development' ? Env.DEVELOPMENT : Env.PRODUCTION,
    logLevel: ocpiConfig.logLevel,
    ocpiServer: ocpiConfig.ocpiServer,

    // Create a fake centralSystem for compatibility (OCPI doesn't need this)
    centralSystem: {
      host: ocpiConfig.ocpiServer.host,
      port: ocpiConfig.ocpiServer.port,
    },

    // Map database configuration from new structure
    data: {
      sequelize: {
        password: ocpiConfig.database.password,
        host: ocpiConfig.database.host,
        port: ocpiConfig.database.port,
        database: ocpiConfig.database.database,
        username: ocpiConfig.database.username,
        storage: '',
        sync: ocpiConfig.database.sync,
      },
    },

    // Map util configuration from new structure
    util: {
      cache: ocpiConfig.cache,
      messageBroker: ocpiConfig.messageBroker || { amqp: false },
      swagger: ocpiConfig.swagger,
      // Add empty defaults for fields OCPI doesn't use
      directus: { generateFlows: false },
      networkConnection: { websocketServers: [] },
    },

    // Map modules - use empty defaults since OCPI has its own module system
    modules: {},

    // Add missing required fields with defaults
    maxCallLengthSeconds: 30,
    maxCachingSeconds: 300,
  };

  return serverConfig;
}
