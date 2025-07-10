// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { OcpiConfigInput } from '@citrineos/ocpi-base';

export function createDockerOcpiConfig(): OcpiConfigInput {
  return {
    env: 'development',

    ocpiServer: {
      host: '0.0.0.0',
      port: 8085,
    },

    ocpiModules: {
      credentials: {
        endpointPrefix: '/credentials',
      },
      versions: {
        endpointPrefix: '/versions',
      },
      locations: {
        endpointPrefix: '/locations',
      },
      sessions: {
        endpointPrefix: '/sessions',
      },
      cdrs: {
        endpointPrefix: '/cdrs',
      },
      tokens: {
        endpointPrefix: '/tokens',
      },
      tariffs: {
        endpointPrefix: '/tariffs',
      },
      chargingProfiles: {
        endpointPrefix: '/chargingprofiles',
      },
      commands: {
        endpointPrefix: '/commands',
      },
    },

    database: {
      host: process.env.DB_HOST || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ocpi',
      username: process.env.DB_USER || 'ocpi',
      password: process.env.DB_PASS || 'ocpi',
      sync: process.env.DB_SYNC === 'true',
    },

    cache: {
      redis: {
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    },

    messageBroker: {
      amqp: {
        url: process.env.AMQP_URL || 'amqp://guest:guest@rabbitmq:5672',
        exchange: process.env.AMQP_EXCHANGE || 'ocpi',
      },
    },

    logLevel: parseInt(process.env.LOG_LEVEL || '2'),
    defaultPageLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT || '50'),
    maxPageLimit: parseInt(process.env.MAX_PAGE_LIMIT || '1000'),
  };
}
