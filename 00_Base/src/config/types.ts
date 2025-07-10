// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { z } from 'zod';

/**
 * OCPI Configuration Schema
 * This schema defines the configuration for the OCPI system without database access.
 * It includes message broker, cache, and server configuration.
 */

export const ocpiConfigInputSchema = z.object({
  env: z.enum(['development', 'production']).default('development'),

  // Central system configuration
  centralSystem: z.object({
    host: z.string().default('localhost').optional(),
    port: z.number().int().positive().default(8081).optional(),
  }),

  // OCPI server configuration
  ocpiServer: z.object({
    host: z.string().default('localhost').optional(),
    port: z.number().int().positive().default(8085).optional(),
  }),

  // Module configurations
  modules: z.object({
    credentials: z.object({
      endpointPrefix: z.string().default('/credentials').optional(),
      host: z.string().default('localhost').optional(),
      port: z.number().int().positive().default(8085).optional(),
    }),
    locations: z.object({
      endpointPrefix: z.string().default('/locations').optional(),
      host: z.string().default('localhost').optional(),
      port: z.number().int().positive().default(8085).optional(),
    }),
    sessions: z.object({
      endpointPrefix: z.string().default('/sessions').optional(),
      host: z.string().default('localhost').optional(),
      port: z.number().int().positive().default(8085).optional(),
    }),
    tariffs: z.object({
      endpointPrefix: z.string().default('/tariffs').optional(),
      host: z.string().default('localhost').optional(),
      port: z.number().int().positive().default(8085).optional(),
    }),
    tokens: z.object({
      endpointPrefix: z.string().default('/tokens').optional(),
      host: z.string().default('localhost').optional(),
      port: z.number().int().positive().default(8085).optional(),
    }),
    cdrs: z.object({
      endpointPrefix: z.string().default('/cdrs').optional(),
      host: z.string().default('localhost').optional(),
      port: z.number().int().positive().default(8085).optional(),
    }),
    chargingProfiles: z.object({
      endpointPrefix: z.string().default('/chargingprofiles').optional(),
      host: z.string().default('localhost').optional(),
      port: z.number().int().positive().default(8085).optional(),
    }),
    commands: z.object({
      endpointPrefix: z.string().default('/commands').optional(),
      host: z.string().default('localhost').optional(),
      port: z.number().int().positive().default(8085).optional(),
    }),
    versions: z.object({
      endpointPrefix: z.string().default('/versions').optional(),
      host: z.string().default('localhost').optional(),
      port: z.number().int().positive().default(8085).optional(),
    }),
  }),

  // Utility configurations
  util: z.object({
    // Cache configuration
    cache: z
      .object({
        memory: z.boolean().optional(),
        redis: z
          .object({
            host: z.string().default('localhost').optional(),
            port: z.number().int().positive().default(6379).optional(),
            password: z.string().optional(),
            database: z.number().int().min(0).default(0).optional(),
          })
          .optional(),
      })
      .refine((obj) => obj.memory || obj.redis, {
        message: 'A cache implementation must be set',
      }),

    // Message broker configuration
    messageBroker: z
      .object({
        kafka: z
          .object({
            topicPrefix: z.string().optional(),
            topicName: z.string().optional(),
            brokers: z.array(z.string()),
            sasl: z
              .object({
                mechanism: z.string(),
                username: z.string(),
                password: z.string(),
              })
              .optional(),
          })
          .optional(),
        amqp: z
          .object({
            url: z.string(),
            exchange: z.string(),
            routingKey: z.string().optional(),
          })
          .optional(),
      })
      .refine((obj) => obj.kafka || obj.amqp, {
        message: 'A message broker implementation must be set',
      }),

    // Authentication provider configuration
    authProvider: z
      .object({
        oidc: z
          .object({
            jwksUri: z.string(),
            issuer: z.string(),
            audience: z.string(),
            cacheTime: z.number().int().positive().default(300).optional(),
            rateLimit: z.boolean().default(false).optional(),
          })
          .optional(),
        localByPass: z.boolean().default(false).optional(),
      })
      .refine((obj) => obj.oidc || obj.localByPass, {
        message: 'An auth provider implementation must be set',
      }),

    // Swagger configuration
    swagger: z
      .object({
        path: z.string().default('/docs').optional(),
        logoPath: z.string().optional(),
        exposeApi: z.boolean().default(true).optional(),
      })
      .optional(),

    // Network connection configuration
    networkConnection: z.object({
      maxRetries: z.number().int().positive().default(3).optional(),
      retryDelay: z.number().int().positive().default(1000).optional(),
      timeout: z.number().int().positive().default(30000).optional(),
    }),
  }),

  // OCPI-specific configurations
  ocpi: z.object({
    // OCPI version support
    supportedVersions: z
      .array(z.enum(['2.1.1', '2.2', '2.2.1']))
      .default(['2.1.1']),

    // Party information
    party: z.object({
      countryCode: z.string().length(2).toUpperCase(),
      partyId: z.string().min(1).max(3),
      role: z
        .enum(['CPO', 'EMSP', 'HUB', 'NAP', 'NSP', 'OTHER'])
        .default('CPO'),
      businessDetails: z.object({
        name: z.string(),
        website: z.string().url().optional(),
        logo: z.string().url().optional(),
      }),
    }),

    // Token validation
    tokenValidation: z.object({
      enabled: z.boolean().default(true),
      cacheExpiry: z.number().int().positive().default(300).optional(),
    }),

    // Location management
    locationManagement: z.object({
      autoPublish: z.boolean().default(true),
      updateInterval: z.number().int().positive().default(3600).optional(),
    }),

    // Tariff management
    tariffManagement: z.object({
      defaultCurrency: z.string().length(3).default('EUR'),
      vatRate: z.number().min(0).max(1).default(0.21).optional(),
    }),

    // Session management
    sessionManagement: z.object({
      maxSessionDuration: z.number().int().positive().default(86400).optional(), // 24 hours
      sessionTimeout: z.number().int().positive().default(3600).optional(), // 1 hour
    }),

    // CDR management
    cdrManagement: z.object({
      autoGenerate: z.boolean().default(true),
      retentionPeriod: z.number().int().positive().default(2592000).optional(), // 30 days
    }),
  }),

  // General system configurations
  logLevel: z.number().min(0).max(6).default(0).optional(),
  maxCallLengthSeconds: z.number().int().positive().default(30).optional(),
  maxCachingSeconds: z.number().int().positive().default(300).optional(),
  maxReconnectDelay: z.number().int().positive().default(30).optional(),

  // User preferences
  userPreferences: z.object({
    telemetryConsent: z.boolean().default(false).optional(),
  }),
});

export type OcpiConfigInput = z.infer<typeof ocpiConfigInputSchema>;

export const ocpiConfigSchema = z
  .object({
    env: z.enum(['development', 'production']),

    centralSystem: z.object({
      host: z.string(),
      port: z.number().int().positive(),
    }),

    ocpiServer: z.object({
      host: z.string(),
      port: z.number().int().positive(),
    }),

    modules: z.object({
      credentials: z.object({
        endpointPrefix: z.string(),
        host: z.string(),
        port: z.number().int().positive(),
      }),
      locations: z.object({
        endpointPrefix: z.string(),
        host: z.string(),
        port: z.number().int().positive(),
      }),
      sessions: z.object({
        endpointPrefix: z.string(),
        host: z.string(),
        port: z.number().int().positive(),
      }),
      tariffs: z.object({
        endpointPrefix: z.string(),
        host: z.string(),
        port: z.number().int().positive(),
      }),
      tokens: z.object({
        endpointPrefix: z.string(),
        host: z.string(),
        port: z.number().int().positive(),
      }),
      cdrs: z.object({
        endpointPrefix: z.string(),
        host: z.string(),
        port: z.number().int().positive(),
      }),
      chargingProfiles: z.object({
        endpointPrefix: z.string(),
        host: z.string(),
        port: z.number().int().positive(),
      }),
      commands: z.object({
        endpointPrefix: z.string(),
        host: z.string(),
        port: z.number().int().positive(),
      }),
      versions: z.object({
        endpointPrefix: z.string(),
        host: z.string(),
        port: z.number().int().positive(),
      }),
    }),

    util: z.object({
      cache: z
        .object({
          memory: z.boolean().optional(),
          redis: z
            .object({
              host: z.string(),
              port: z.number().int().positive(),
              password: z.string().optional(),
              database: z.number().int().min(0),
            })
            .optional(),
        })
        .refine((obj) => obj.memory || obj.redis, {
          message: 'A cache implementation must be set',
        }),

      messageBroker: z
        .object({
          kafka: z
            .object({
              topicPrefix: z.string().optional(),
              topicName: z.string().optional(),
              brokers: z.array(z.string()),
              sasl: z
                .object({
                  mechanism: z.string(),
                  username: z.string(),
                  password: z.string(),
                })
                .optional(),
            })
            .optional(),
          amqp: z
            .object({
              url: z.string(),
              exchange: z.string(),
              routingKey: z.string().optional(),
            })
            .optional(),
        })
        .refine((obj) => obj.kafka || obj.amqp, {
          message: 'A message broker implementation must be set',
        }),

      authProvider: z
        .object({
          oidc: z
            .object({
              jwksUri: z.string(),
              issuer: z.string(),
              audience: z.string(),
              cacheTime: z.number().int().positive(),
              rateLimit: z.boolean(),
            })
            .optional(),
          localByPass: z.boolean(),
        })
        .refine((obj) => obj.oidc || obj.localByPass, {
          message: 'An auth provider implementation must be set',
        }),

      swagger: z
        .object({
          path: z.string(),
          logoPath: z.string().optional(),
          exposeApi: z.boolean(),
        })
        .optional(),

      networkConnection: z.object({
        maxRetries: z.number().int().positive(),
        retryDelay: z.number().int().positive(),
        timeout: z.number().int().positive(),
      }),
    }),

    ocpi: z.object({
      supportedVersions: z.array(z.enum(['2.1.1', '2.2', '2.2.1'])),

      party: z.object({
        countryCode: z.string().length(2),
        partyId: z.string().min(1).max(3),
        role: z.enum(['CPO', 'EMSP', 'HUB', 'NAP', 'NSP', 'OTHER']),
        businessDetails: z.object({
          name: z.string(),
          website: z.string().url().optional(),
          logo: z.string().url().optional(),
        }),
      }),

      tokenValidation: z.object({
        enabled: z.boolean(),
        cacheExpiry: z.number().int().positive(),
      }),

      locationManagement: z.object({
        autoPublish: z.boolean(),
        updateInterval: z.number().int().positive(),
      }),

      tariffManagement: z.object({
        defaultCurrency: z.string().length(3),
        vatRate: z.number().min(0).max(1),
      }),

      sessionManagement: z.object({
        maxSessionDuration: z.number().int().positive(),
        sessionTimeout: z.number().int().positive(),
      }),

      cdrManagement: z.object({
        autoGenerate: z.boolean(),
        retentionPeriod: z.number().int().positive(),
      }),
    }),

    logLevel: z.number().min(0).max(6),
    maxCallLengthSeconds: z.number().int().positive(),
    maxCachingSeconds: z.number().int().positive(),
    maxReconnectDelay: z.number().int().positive(),

    userPreferences: z.object({
      telemetryConsent: z.boolean(),
    }),
  })
  .refine((obj) => obj.maxCachingSeconds >= obj.maxCallLengthSeconds, {
    message: 'maxCachingSeconds cannot be less than maxCallLengthSeconds',
  });

export type OcpiConfig = z.infer<typeof ocpiConfigSchema>;
