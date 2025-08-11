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
      database: process.env.DB_NAME || 'citrine',
      username: process.env.DB_USER || 'citrine',
      password: process.env.DB_PASS || 'citrine',
    },

    cache: {
      memory: true,
    },

    graphql: {
      endpoint: process.env.GRAPHQL_ENDPOINT || 'http://graphql-engine:8080/v1/graphql',
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
