// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  OcpiConfig,
  ocpiConfigSchema,
} from '@citrineos/ocpi-base/dist/config/types';

// Sample OCPI configuration using the full OcpiConfig structure
const ocpiConfigInput: Partial<OcpiConfig> = {
  env: 'development',

  centralSystem: {
    host: 'localhost',
    port: 8081,
  },

  ocpiServer: {
    host: '0.0.0.0',
    port: 8085,
  },

  // Module configurations
  modules: {
    credentials: {
      endpointPrefix: '/credentials',
      host: 'localhost',
      port: 8085,
    },
    locations: {
      endpointPrefix: '/locations',
      host: 'localhost',
      port: 8085,
    },
    sessions: {
      endpointPrefix: '/sessions',
      host: 'localhost',
      port: 8085,
    },
    tariffs: {
      endpointPrefix: '/tariffs',
      host: 'localhost',
      port: 8085,
    },
    tokens: {
      endpointPrefix: '/tokens',
      host: 'localhost',
      port: 8085,
    },
    cdrs: {
      endpointPrefix: '/cdrs',
      host: 'localhost',
      port: 8085,
    },
    chargingProfiles: {
      endpointPrefix: '/chargingprofiles',
      host: 'localhost',
      port: 8085,
    },
    commands: {
      endpointPrefix: '/commands',
      host: 'localhost',
      port: 8085,
    },
    versions: {
      endpointPrefix: '/versions',
      host: 'localhost',
      port: 8085,
    },
  },

  // Utility configurations
  util: {
    // Cache configuration - Redis or memory
    cache: {
      memory: true,
      // redis: {
      //   host: 'localhost',
      //   port: 6379,
      //   database: 0,
      // },
    },

    // Message broker configuration - Kafka or AMQP
    messageBroker: {
      amqp: {
        url: 'amqp://localhost:5672',
        exchange: 'ocpi.exchange',
        routingKey: 'ocpi.routing.key',
      },
      // kafka: {
      //   brokers: ['localhost:9092'],
      //   topicPrefix: 'ocpi',
      //   sasl: {
      //     mechanism: 'plain',
      //     username: 'ocpi',
      //     password: 'ocpi-password',
      //   },
      // },
    },

    // Authentication provider
    authProvider: {
      localByPass: true,
      // oidc: {
      //   jwksUri: 'https://your-oidc-provider.com/.well-known/jwks.json',
      //   issuer: 'https://your-oidc-provider.com',
      //   audience: 'ocpi-api',
      //   cacheTime: 300,
      //   rateLimit: false,
      // },
    },

    // Network connection configuration
    networkConnection: {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
    },
  },

  // OCPI-specific configuration
  ocpi: {
    supportedVersions: ['2.1.1', '2.2', '2.2.1'],

    party: {
      countryCode: 'US',
      partyId: 'CPO',
      role: 'CPO',
      businessDetails: {
        name: 'CitrineOS OCPI',
        website: 'https://citrineos.github.io',
        logo: 'https://citrineos.github.io/logo.png',
      },
    },

    tokenValidation: {
      enabled: true,
      cacheExpiry: 300,
    },

    locationManagement: {
      autoPublish: true,
      updateInterval: 3600,
    },

    tariffManagement: {
      defaultCurrency: 'USD',
      vatRate: 0.08,
    },

    sessionManagement: {
      maxSessionDuration: 86400, // 24 hours
      sessionTimeout: 3600, // 1 hour
    },

    cdrManagement: {
      autoGenerate: true,
      retentionPeriod: 2592000, // 30 days
    },
  },

  // General system settings
  logLevel: 0, // Debug level
  maxCallLengthSeconds: 30,
  maxCachingSeconds: 300,
  maxReconnectDelay: 30,

  userPreferences: {
    telemetryConsent: false,
  },
};

// Export the validated configuration
export const sampleOcpiConfig = ocpiConfigSchema.parse(ocpiConfigInput);
