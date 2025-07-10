// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  OcpiConfigInput,
  OcpiConfig,
  ocpiConfigInputSchema,
  ocpiConfigSchema,
} from './types';
import { OcpiConfigStoreFactory } from './OcpiConfigStore';

/**
 * Define OCPI configuration with validation
 */
export function defineOcpiConfig(input: OcpiConfigInput): OcpiConfig {
  // Validate input schema
  const validatedInput = ocpiConfigInputSchema.parse(input);

  // Transform to full config with all defaults applied
  const config: OcpiConfig = {
    env: validatedInput.env,

    centralSystem: {
      host: validatedInput.centralSystem?.host || 'localhost',
      port: validatedInput.centralSystem?.port || 8081,
    },

    ocpiServer: {
      host: validatedInput.ocpiServer?.host || 'localhost',
      port: validatedInput.ocpiServer?.port || 8085,
    },

    modules: {
      credentials: {
        endpointPrefix:
          validatedInput.modules?.credentials?.endpointPrefix || '/credentials',
        host: validatedInput.modules?.credentials?.host || 'localhost',
        port: validatedInput.modules?.credentials?.port || 8085,
      },
      locations: {
        endpointPrefix:
          validatedInput.modules?.locations?.endpointPrefix || '/locations',
        host: validatedInput.modules?.locations?.host || 'localhost',
        port: validatedInput.modules?.locations?.port || 8085,
      },
      sessions: {
        endpointPrefix:
          validatedInput.modules?.sessions?.endpointPrefix || '/sessions',
        host: validatedInput.modules?.sessions?.host || 'localhost',
        port: validatedInput.modules?.sessions?.port || 8085,
      },
      tariffs: {
        endpointPrefix:
          validatedInput.modules?.tariffs?.endpointPrefix || '/tariffs',
        host: validatedInput.modules?.tariffs?.host || 'localhost',
        port: validatedInput.modules?.tariffs?.port || 8085,
      },
      tokens: {
        endpointPrefix:
          validatedInput.modules?.tokens?.endpointPrefix || '/tokens',
        host: validatedInput.modules?.tokens?.host || 'localhost',
        port: validatedInput.modules?.tokens?.port || 8085,
      },
      cdrs: {
        endpointPrefix: validatedInput.modules?.cdrs?.endpointPrefix || '/cdrs',
        host: validatedInput.modules?.cdrs?.host || 'localhost',
        port: validatedInput.modules?.cdrs?.port || 8085,
      },
      chargingProfiles: {
        endpointPrefix:
          validatedInput.modules?.chargingProfiles?.endpointPrefix ||
          '/chargingprofiles',
        host: validatedInput.modules?.chargingProfiles?.host || 'localhost',
        port: validatedInput.modules?.chargingProfiles?.port || 8085,
      },
      commands: {
        endpointPrefix:
          validatedInput.modules?.commands?.endpointPrefix || '/commands',
        host: validatedInput.modules?.commands?.host || 'localhost',
        port: validatedInput.modules?.commands?.port || 8085,
      },
      versions: {
        endpointPrefix:
          validatedInput.modules?.versions?.endpointPrefix || '/versions',
        host: validatedInput.modules?.versions?.host || 'localhost',
        port: validatedInput.modules?.versions?.port || 8085,
      },
    },

    util: {
      cache: {
        memory: validatedInput.util.cache.memory,
        redis: validatedInput.util.cache.redis
          ? {
              host: validatedInput.util.cache.redis.host || 'localhost',
              port: validatedInput.util.cache.redis.port || 6379,
              password: validatedInput.util.cache.redis.password,
              database: validatedInput.util.cache.redis.database || 0,
            }
          : undefined,
      },

      messageBroker: {
        kafka: validatedInput.util.messageBroker.kafka
          ? {
              topicPrefix: validatedInput.util.messageBroker.kafka.topicPrefix,
              topicName: validatedInput.util.messageBroker.kafka.topicName,
              brokers: validatedInput.util.messageBroker.kafka.brokers,
              sasl: validatedInput.util.messageBroker.kafka.sasl,
            }
          : undefined,
        amqp: validatedInput.util.messageBroker.amqp
          ? {
              url: validatedInput.util.messageBroker.amqp.url,
              exchange: validatedInput.util.messageBroker.amqp.exchange,
              routingKey: validatedInput.util.messageBroker.amqp.routingKey,
            }
          : undefined,
      },

      authProvider: {
        oidc: validatedInput.util.authProvider.oidc
          ? {
              jwksUri: validatedInput.util.authProvider.oidc.jwksUri,
              issuer: validatedInput.util.authProvider.oidc.issuer,
              audience: validatedInput.util.authProvider.oidc.audience,
              cacheTime: validatedInput.util.authProvider.oidc.cacheTime || 300,
              rateLimit:
                validatedInput.util.authProvider.oidc.rateLimit || false,
            }
          : undefined,
        localByPass: validatedInput.util.authProvider.localByPass || false,
      },

      swagger: validatedInput.util.swagger
        ? {
            path: validatedInput.util.swagger.path || '/docs',
            logoPath: validatedInput.util.swagger.logoPath,
            exposeApi: validatedInput.util.swagger.exposeApi || true,
          }
        : undefined,

      networkConnection: {
        maxRetries: validatedInput.util.networkConnection?.maxRetries || 3,
        retryDelay: validatedInput.util.networkConnection?.retryDelay || 1000,
        timeout: validatedInput.util.networkConnection?.timeout || 30000,
      },
    },

    ocpi: {
      supportedVersions: validatedInput.ocpi?.supportedVersions || ['2.1.1'],

      party: {
        countryCode: validatedInput.ocpi!.party.countryCode,
        partyId: validatedInput.ocpi!.party.partyId,
        role: validatedInput.ocpi!.party.role,
        businessDetails: {
          name: validatedInput.ocpi!.party.businessDetails.name,
          website: validatedInput.ocpi!.party.businessDetails.website,
          logo: validatedInput.ocpi!.party.businessDetails.logo,
        },
      },

      tokenValidation: {
        enabled: validatedInput.ocpi?.tokenValidation?.enabled || true,
        cacheExpiry: validatedInput.ocpi?.tokenValidation?.cacheExpiry || 300,
      },

      locationManagement: {
        autoPublish:
          validatedInput.ocpi?.locationManagement?.autoPublish || true,
        updateInterval:
          validatedInput.ocpi?.locationManagement?.updateInterval || 3600,
      },

      tariffManagement: {
        defaultCurrency:
          validatedInput.ocpi?.tariffManagement?.defaultCurrency || 'EUR',
        vatRate: validatedInput.ocpi?.tariffManagement?.vatRate || 0.21,
      },

      sessionManagement: {
        maxSessionDuration:
          validatedInput.ocpi?.sessionManagement?.maxSessionDuration || 86400,
        sessionTimeout:
          validatedInput.ocpi?.sessionManagement?.sessionTimeout || 3600,
      },

      cdrManagement: {
        autoGenerate: validatedInput.ocpi?.cdrManagement?.autoGenerate || true,
        retentionPeriod:
          validatedInput.ocpi?.cdrManagement?.retentionPeriod || 2592000,
      },
    },

    logLevel: validatedInput.logLevel || 0,
    maxCallLengthSeconds: validatedInput.maxCallLengthSeconds || 30,
    maxCachingSeconds: validatedInput.maxCachingSeconds || 300,
    maxReconnectDelay: validatedInput.maxReconnectDelay || 30,

    userPreferences: {
      telemetryConsent:
        validatedInput.userPreferences?.telemetryConsent || false,
    },
  };

  // Validate final config
  return ocpiConfigSchema.parse(config);
}

/**
 * Load OCPI configuration from the config store
 */
export async function loadOcpiConfig(): Promise<OcpiConfig | null> {
  const configStore = OcpiConfigStoreFactory.getInstance();
  return await configStore.fetchConfig();
}

/**
 * Save OCPI configuration to the config store
 */
export async function saveOcpiConfig(config: OcpiConfig): Promise<void> {
  const configStore = OcpiConfigStoreFactory.getInstance();
  await configStore.saveConfig(config);
}
