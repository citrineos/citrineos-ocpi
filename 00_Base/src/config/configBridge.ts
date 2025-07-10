// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { OcpiConfig } from './ocpi.types';
import { ServerConfig } from './ServerConfig';
import {
  ServerConfigCentralSystem,
  ServerConfigData,
  ServerConfigModules,
  ServerConfigUtil,
  ServerConfigHostPort,
  ServerConfigUtilCache,
  ServerConfigUtilMessageBroker,
  ServerConfigUtilNetworkConnection,
  ServerConfigUtilDirectus,
  LogLevel,
  Env,
} from './sub';

/**
 * Configuration Bridge
 * Creates a type-safe bridge between OcpiConfig and the legacy server expectations
 * This allows the server to use the new OCPI config while maintaining compatibility
 *
 * Note: Some type assertions are still necessary because the ServerConfig classes
 * have additional fields that are not present in OcpiConfig. This is intentional
 * as OCPI modules only need a subset of the full CitrineOS configuration.
 */
export function createServerConfigFromOcpi(
  ocpiConfig: OcpiConfig,
): ServerConfig {
  const serverConfig = new ServerConfig();

  // Map environment
  serverConfig.env =
    ocpiConfig.env === 'development' ? Env.DEVELOPMENT : Env.PRODUCTION;

  // Map central system configuration
  serverConfig.centralSystem = {
    host: ocpiConfig.centralSystem.host,
    port: ocpiConfig.centralSystem.port,
  } as ServerConfigCentralSystem;

  // Map modules configuration - create a partial mapping with required fields
  serverConfig.modules = {
    certificates: ocpiConfig.modules.certificates
      ? {
          endpointPrefix: ocpiConfig.modules.certificates.endpointPrefix,
        }
      : undefined,
    configuration: {
      heartbeatInterval: ocpiConfig.modules.configuration.heartbeatInterval,
      bootRetryInterval: ocpiConfig.modules.configuration.bootRetryInterval,
      unknownChargerStatus:
        ocpiConfig.modules.configuration.unknownChargerStatus,
      getBaseReportOnPending:
        ocpiConfig.modules.configuration.getBaseReportOnPending,
      bootWithRejectedVariables:
        ocpiConfig.modules.configuration.bootWithRejectedVariables,
      autoAccept: ocpiConfig.modules.configuration.autoAccept,
      endpointPrefix: ocpiConfig.modules.configuration.endpointPrefix,
    },
    evdriver: {
      endpointPrefix: ocpiConfig.modules.evdriver.endpointPrefix,
    },
    monitoring: {
      endpointPrefix: ocpiConfig.modules.monitoring.endpointPrefix,
    },
    reporting: {
      endpointPrefix: ocpiConfig.modules.reporting.endpointPrefix,
    },
    smartcharging: {
      endpointPrefix: ocpiConfig.modules.smartcharging.endpointPrefix,
    },
    tenant: {
      endpointPrefix: ocpiConfig.modules.tenant.endpointPrefix,
    },
    transactions: {
      endpointPrefix: ocpiConfig.modules.transactions.endpointPrefix,
      costUpdatedInterval: ocpiConfig.modules.transactions.costUpdatedInterval,
    },
  } as ServerConfigModules;

  // Map data configuration with dummy DB config (should not be used in OCPI context)
  serverConfig.data = {
    sequelize: {
      password: '',
      host: '',
      port: 0,
      database: '',
      username: '',
      storage: '',
      sync: false,
    },
  } as ServerConfigData;

  // Map util configuration
  serverConfig.util = {
    cache: {
      memory: ocpiConfig.util.cache.memory,
      redis: ocpiConfig.util.cache.redis
        ? {
            host: ocpiConfig.util.cache.redis.host,
            port: ocpiConfig.util.cache.redis.port,
          }
        : undefined,
    } as ServerConfigUtilCache,

    messageBroker: {
      amqp: ocpiConfig.util.messageBroker.amqp
        ? {
            url: ocpiConfig.util.messageBroker.amqp.url,
            exchange: ocpiConfig.util.messageBroker.amqp.exchange,
          }
        : undefined,
      kafka: ocpiConfig.util.messageBroker.kafka
        ? {
            topicPrefix: ocpiConfig.util.messageBroker.kafka.topicPrefix,
            topicName: ocpiConfig.util.messageBroker.kafka.topicName,
            brokers: ocpiConfig.util.messageBroker.kafka.brokers,
            sasl: ocpiConfig.util.messageBroker.kafka.sasl
              ? {
                  mechanism: ocpiConfig.util.messageBroker.kafka.sasl.mechanism,
                  username: ocpiConfig.util.messageBroker.kafka.sasl.username,
                  password: ocpiConfig.util.messageBroker.kafka.sasl.password,
                }
              : undefined,
          }
        : undefined,
    } as ServerConfigUtilMessageBroker,

    // Add network connection with empty defaults since OCPI doesn't use websockets
    networkConnection: {
      websocketServers: [],
    } as ServerConfigUtilNetworkConnection,

    // Add directus with disabled defaults
    directus: {
      generateFlows: false,
    } as ServerConfigUtilDirectus,

    // Map swagger if present
    swagger: ocpiConfig.util.swagger
      ? {
          path: ocpiConfig.util.swagger.path,
          logoPath: ocpiConfig.util.swagger.logoPath,
          exposeData: ocpiConfig.util.swagger.exposeData,
          exposeMessage: ocpiConfig.util.swagger.exposeMessage,
        }
      : undefined,

    // Map certificate authority
    certificateAuthority: {
      v2gCA: {
        name: ocpiConfig.util.certificateAuthority.v2gCA.name,
        hubject: ocpiConfig.util.certificateAuthority.v2gCA.hubject
          ? {
              baseUrl:
                ocpiConfig.util.certificateAuthority.v2gCA.hubject.baseUrl,
              tokenUrl:
                ocpiConfig.util.certificateAuthority.v2gCA.hubject.tokenUrl,
              isoVersion:
                ocpiConfig.util.certificateAuthority.v2gCA.hubject.isoVersion,
            }
          : undefined,
      },
      chargingStationCA: {
        name: ocpiConfig.util.certificateAuthority.chargingStationCA.name,
        acme: ocpiConfig.util.certificateAuthority.chargingStationCA.acme
          ? {
              env: ocpiConfig.util.certificateAuthority.chargingStationCA.acme
                .env,
              accountKeyFilePath:
                ocpiConfig.util.certificateAuthority.chargingStationCA.acme
                  .accountKeyFilePath,
              email:
                ocpiConfig.util.certificateAuthority.chargingStationCA.acme
                  .email,
            }
          : undefined,
      },
    },

    // Map graphql
    graphql: {
      url: ocpiConfig.util.graphql.url,
      adminSecret: ocpiConfig.util.graphql.adminSecret,
    },
  } as ServerConfigUtil;

  // Map remaining fields
  serverConfig.logLevel = ocpiConfig.logLevel as LogLevel;
  serverConfig.maxCallLengthSeconds = ocpiConfig.maxCallLengthSeconds;
  serverConfig.maxCachingSeconds = ocpiConfig.maxCachingSeconds;

  // Map OCPI server configuration
  serverConfig.ocpiServer = {
    host: ocpiConfig.ocpiServer.host,
    port: ocpiConfig.ocpiServer.port,
  } as ServerConfigHostPort;

  return serverConfig;
}
