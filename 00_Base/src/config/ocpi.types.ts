// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { z } from 'zod';

/**
 * OCPI Configuration Schema
 * This schema defines the configuration structure specific to OCPI modules,
 * excluding database configuration but including necessary cache and message broker settings.
 */
export const ocpiConfigInputSchema = z.object({
  env: z.enum(['development', 'production']),

  centralSystem: z.object({
    host: z.string().default('0.0.0.0').optional(),
    port: z.number().int().positive().default(8080).optional(),
  }),

  modules: z.object({
    certificates: z
      .object({
        endpointPrefix: z.string().default('/certificates').optional(),
      })
      .optional(),

    configuration: z.object({
      heartbeatInterval: z.number().int().positive().default(60).optional(),
      bootRetryInterval: z.number().int().positive().default(15).optional(),
      unknownChargerStatus: z.string().default('Accepted').optional(),
      getBaseReportOnPending: z.boolean().default(true).optional(),
      bootWithRejectedVariables: z.boolean().default(true).optional(),
      autoAccept: z.boolean().default(true).optional(),
      endpointPrefix: z.string().default('/configuration').optional(),
    }),

    evdriver: z.object({
      endpointPrefix: z.string().default('/evdriver').optional(),
    }),

    monitoring: z.object({
      endpointPrefix: z.string().default('/monitoring').optional(),
    }),

    reporting: z.object({
      endpointPrefix: z.string().default('/reporting').optional(),
    }),

    smartcharging: z.object({
      endpointPrefix: z.string().default('/smartcharging').optional(),
    }),

    tenant: z.object({
      endpointPrefix: z.string().default('/tenant').optional(),
    }),

    transactions: z.object({
      endpointPrefix: z.string().default('/transactions').optional(),
      costUpdatedInterval: z.number().int().positive().default(60).optional(),
    }),
  }),

  util: z.object({
    cache: z
      .object({
        memory: z.boolean().optional(),
        redis: z
          .object({
            host: z.string().default('localhost').optional(),
            port: z.number().int().positive().default(6379).optional(),
          })
          .optional(),
      })
      .refine((obj) => obj.memory || obj.redis, {
        message: 'A cache implementation must be set',
      }),

    messageBroker: z
      .object({
        amqp: z
          .object({
            url: z.string(),
            exchange: z.string(),
          })
          .optional(),
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
      })
      .refine((obj) => obj.amqp || obj.kafka, {
        message: 'A message broker implementation must be set',
      }),

    swagger: z
      .object({
        path: z.string().default('/docs').optional(),
        logoPath: z.string(),
        exposeData: z.boolean().default(true).optional(),
        exposeMessage: z.boolean().default(true).optional(),
      })
      .optional(),

    certificateAuthority: z.object({
      v2gCA: z
        .object({
          name: z.enum(['hubject']).default('hubject'),
          hubject: z
            .object({
              baseUrl: z
                .string()
                .default('https://open.plugncharge-test.hubject.com'),
              tokenUrl: z
                .string()
                .default(
                  'https://hubject.stoplight.io/api/v1/projects/cHJqOjk0NTg5/nodes/6bb8b3bc79c2e-authorization-token',
                ),
              isoVersion: z
                .enum(['ISO15118-2', 'ISO15118-20'])
                .default('ISO15118-2'),
            })
            .optional(),
        })
        .refine((obj) => {
          if (obj.name === 'hubject') {
            return obj.hubject;
          }
          return false;
        }),
      chargingStationCA: z
        .object({
          name: z.enum(['acme']).default('acme'),
          acme: z
            .object({
              env: z.enum(['staging', 'production']).default('staging'),
              accountKeyFilePath: z.string(),
              email: z.string(),
            })
            .optional(),
        })
        .refine((obj) => {
          if (obj.name === 'acme') {
            return obj.acme;
          }
          return false;
        }),
    }),

    graphql: z.object({
      url: z.string(),
      adminSecret: z.string(),
    }),
  }),

  logLevel: z.number().min(0).max(6).default(2).optional(),
  maxCallLengthSeconds: z.number().int().positive().default(5).optional(),
  maxCachingSeconds: z.number().int().positive().default(10).optional(),

  ocpiServer: z.object({
    host: z.string().default('0.0.0.0').optional(),
    port: z.number().int().positive().default(8085).optional(),
  }),

  userPreferences: z
    .object({
      telemetryConsent: z.boolean().default(false).optional(),
    })
    .optional(),
});

export type OcpiConfigInput = z.infer<typeof ocpiConfigInputSchema>;

/**
 * Processed/validated OCPI Configuration Schema
 */
export const ocpiConfigSchema = z.object({
  env: z.enum(['development', 'production']),

  centralSystem: z.object({
    host: z.string(),
    port: z.number().int().positive(),
  }),

  modules: z.object({
    certificates: z
      .object({
        endpointPrefix: z.string(),
      })
      .optional(),

    configuration: z.object({
      heartbeatInterval: z.number().int().positive(),
      bootRetryInterval: z.number().int().positive(),
      unknownChargerStatus: z.string(),
      getBaseReportOnPending: z.boolean(),
      bootWithRejectedVariables: z.boolean(),
      autoAccept: z.boolean(),
      endpointPrefix: z.string(),
    }),

    evdriver: z.object({
      endpointPrefix: z.string(),
    }),

    monitoring: z.object({
      endpointPrefix: z.string(),
    }),

    reporting: z.object({
      endpointPrefix: z.string(),
    }),

    smartcharging: z.object({
      endpointPrefix: z.string(),
    }),

    tenant: z.object({
      endpointPrefix: z.string(),
    }),

    transactions: z.object({
      endpointPrefix: z.string(),
      costUpdatedInterval: z.number().int().positive(),
    }),
  }),

  util: z.object({
    cache: z.object({
      memory: z.boolean().optional(),
      redis: z
        .object({
          host: z.string(),
          port: z.number().int().positive(),
        })
        .optional(),
    }),

    messageBroker: z.object({
      amqp: z
        .object({
          url: z.string(),
          exchange: z.string(),
        })
        .optional(),
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
    }),

    swagger: z
      .object({
        path: z.string(),
        logoPath: z.string(),
        exposeData: z.boolean(),
        exposeMessage: z.boolean(),
      })
      .optional(),

    certificateAuthority: z.object({
      v2gCA: z.object({
        name: z.enum(['hubject']),
        hubject: z
          .object({
            baseUrl: z.string(),
            tokenUrl: z.string(),
            isoVersion: z.enum(['ISO15118-2', 'ISO15118-20']),
          })
          .optional(),
      }),
      chargingStationCA: z.object({
        name: z.enum(['acme']),
        acme: z
          .object({
            env: z.enum(['staging', 'production']),
            accountKeyFilePath: z.string(),
            email: z.string(),
          })
          .optional(),
      }),
    }),

    graphql: z.object({
      url: z.string(),
      adminSecret: z.string(),
    }),
  }),

  logLevel: z.number().min(0).max(6),
  maxCallLengthSeconds: z.number().int().positive(),
  maxCachingSeconds: z.number().int().positive(),

  ocpiServer: z.object({
    host: z.string(),
    port: z.number().int().positive(),
  }),

  userPreferences: z
    .object({
      telemetryConsent: z.boolean(),
    })
    .optional(),
});

export type OcpiConfig = z.infer<typeof ocpiConfigSchema>;
