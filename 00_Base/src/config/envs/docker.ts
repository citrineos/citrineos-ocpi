// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { OcpiConfigInput } from '../ocpi.types';
import path from 'path';

export function createDockerOcpiConfig(): OcpiConfigInput {
  return {
    env: 'development',

    centralSystem: {
      host: '0.0.0.0',
      port: 8080,
    },

    modules: {
      certificates: {
        endpointPrefix: '/certificates',
      },

      configuration: {
        heartbeatInterval: 60,
        bootRetryInterval: 15,
        unknownChargerStatus: 'Accepted',
        getBaseReportOnPending: true,
        bootWithRejectedVariables: true,
        autoAccept: true,
        endpointPrefix: '/configuration',
      },

      evdriver: {
        endpointPrefix: '/evdriver',
      },

      monitoring: {
        endpointPrefix: '/monitoring',
      },

      reporting: {
        endpointPrefix: '/reporting',
      },

      smartcharging: {
        endpointPrefix: '/smartcharging',
      },

      tenant: {
        endpointPrefix: '/tenant',
      },

      transactions: {
        endpointPrefix: '/transactions',
        costUpdatedInterval: 60,
      },
    },

    util: {
      cache: {
        redis: {
          host: 'redis',
          port: 6379,
        },
      },

      messageBroker: {
        amqp: {
          url: 'amqp://guest:guest@rabbitmq:5672',
          exchange: 'citrineos',
        },
      },

      swagger: {
        path: '/docs',
        logoPath: path.resolve(
          path.dirname(__filename),
          '../../assets/logo.png',
        ),
        exposeData: true,
        exposeMessage: true,
      },

      certificateAuthority: {
        v2gCA: {
          name: 'hubject',
          hubject: {
            baseUrl: 'https://open.plugncharge-test.hubject.com',
            tokenUrl:
              'https://hubject.stoplight.io/api/v1/projects/cHJqOjk0NTg5/nodes/6bb8b3bc79c2e-authorization-token',
            isoVersion: 'ISO15118-2',
          },
        },
        chargingStationCA: {
          name: 'acme',
          acme: {
            env: 'staging',
            accountKeyFilePath: path.resolve(
              path.dirname(__filename),
              '../../assets/certificates/acme_account_key.pem',
            ),
            email: 'test@citrineos.com',
          },
        },
      },

      graphql: {
        url: 'http://localhost:8090/v1/graphql',
        adminSecret: 'CitrineOS!',
      },
    },

    logLevel: 2, // debug
    maxCallLengthSeconds: 5,
    maxCachingSeconds: 10,

    ocpiServer: {
      host: '0.0.0.0',
      port: 8085,
    },

    userPreferences: {
      telemetryConsent: false,
    },
  };
}
