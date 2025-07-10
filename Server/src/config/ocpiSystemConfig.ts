// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { z } from 'zod';

// Define a simpler config that removes database dependencies
// This serves as the new system config for OCPI without DB access
export const ocpiSystemConfigSchema = z.object({
  env: z.enum(['development', 'production']).default('development'),

  // Central system configuration (for integration with core)
  centralSystem: z.object({
    host: z.string().default('localhost'),
    port: z.number().int().positive().default(8081),
  }),

  // OCPI server configuration
  ocpiServer: z.object({
    host: z.string().default('localhost'),
    port: z.number().int().positive().default(8085),
  }),

  // Cache configuration (Redis or memory)
  cache: z
    .object({
      memory: z.boolean().optional(),
      redis: z
        .object({
          host: z.string().default('localhost'),
          port: z.number().int().positive().default(6379),
          password: z.string().optional(),
          database: z.number().int().min(0).default(0),
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

  // Authentication provider
  authProvider: z
    .object({
      oidc: z
        .object({
          jwksUri: z.string(),
          issuer: z.string(),
          audience: z.string(),
          cacheTime: z.number().int().positive().default(300),
          rateLimit: z.boolean().default(false),
        })
        .optional(),
      localByPass: z.boolean().default(false),
    })
    .refine((obj) => obj.oidc || obj.localByPass, {
      message: 'An auth provider implementation must be set',
    }),

  // OCPI specific settings
  ocpi: z.object({
    supportedVersions: z
      .array(z.enum(['2.1.1', '2.2', '2.2.1']))
      .default(['2.1.1']),
    party: z.object({
      countryCode: z.string().length(2),
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
    tokenValidation: z.object({
      enabled: z.boolean().default(true),
      cacheExpiry: z.number().int().positive().default(300),
    }),
    locationManagement: z.object({
      autoPublish: z.boolean().default(true),
      updateInterval: z.number().int().positive().default(3600),
    }),
    tariffManagement: z.object({
      defaultCurrency: z.string().length(3).default('EUR'),
      vatRate: z.number().min(0).max(1).default(0.21),
    }),
    sessionManagement: z.object({
      maxSessionDuration: z.number().int().positive().default(86400),
      sessionTimeout: z.number().int().positive().default(3600),
    }),
    cdrManagement: z.object({
      autoGenerate: z.boolean().default(true),
      retentionPeriod: z.number().int().positive().default(2592000),
    }),
  }),

  // General settings
  logLevel: z.number().min(0).max(6).default(0),
  maxCallLengthSeconds: z.number().int().positive().default(30),
  maxCachingSeconds: z.number().int().positive().default(300),
  maxReconnectDelay: z.number().int().positive().default(30),

  userPreferences: z.object({
    telemetryConsent: z.boolean().default(false),
  }),
});

export type OcpiSystemConfig = z.infer<typeof ocpiSystemConfigSchema>;
