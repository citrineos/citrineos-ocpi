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
  const serverConfig = new ServerConfig();

  // Copy the essential fields that exist in both configs
  serverConfig.env =
    ocpiConfig.env === 'development' ? Env.DEVELOPMENT : Env.PRODUCTION;
  serverConfig.logLevel = ocpiConfig.logLevel;
  serverConfig.ocpiServer = ocpiConfig.ocpiServer;

  // Create a fake centralSystem for compatibility (OCPI doesn't need this)
  serverConfig.centralSystem = {
    host: ocpiConfig.ocpiServer.host,
    port: ocpiConfig.ocpiServer.port,
  } as any;

  // Map database configuration from new structure
  serverConfig.data = {
    sequelize: {
      password: ocpiConfig.database.password,
      host: ocpiConfig.database.host,
      port: ocpiConfig.database.port,
      database: ocpiConfig.database.database,
      username: ocpiConfig.database.username,
      storage: '',
      sync: ocpiConfig.database.sync,
    },
  } as any;

  // Map util configuration from new structure
  serverConfig.util = {
    cache: ocpiConfig.cache,
    messageBroker: ocpiConfig.messageBroker,
    swagger: ocpiConfig.swagger,
    // Add empty defaults for fields OCPI doesn't use
    directus: { generateFlows: false },
    networkConnection: { websocketServers: [] },
    certificateAuthority: { v2gCA: {}, chargingStationCA: {} },
    graphql: { url: '', adminSecret: '' },
  } as any;

  // Map modules - use empty defaults since OCPI has its own module system
  serverConfig.modules = {} as any;

  // Add missing required fields with defaults
  serverConfig.maxCallLengthSeconds = 30;
  serverConfig.maxCachingSeconds = 300;

  return serverConfig;
}
