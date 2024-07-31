// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { defineConfig, RegistrationStatusEnumType } from '@citrineos/base';

export function createDockerConfig() {
  return defineConfig({
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
        unknownChargerStatus: RegistrationStatusEnumType.Accepted,
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
    data: {
      sequelize: {
        host: 'ocpp-db',
        port: 5432,
        database: 'citrine',
        dialect: 'postgres',
        username: 'citrine',
        password: 'citrine',
        storage: '',
        sync: false,
        alter: true,
      },
    },
    util: {
      cache: {
        memory: true,
      },
      messageBroker: {
        amqp: {
          url: 'amqp://guest:guest@amqp-broker:5672',
          exchange: 'citrineos',
        },
      },
      swagger: {
        path: '/docs',
        logoPath: '/usr/local/apps/citrineos-core/Server/src/assets/logo.png',
        exposeData: true,
        exposeMessage: true,
      },
      directus: {
        host: 'directus',
        port: 8055,
        generateFlows: true,
      },
      networkConnection: {
        websocketServers: [
          {
            id: '0',
            securityProfile: 0,
            allowUnknownChargingStations: true,
            pingInterval: 60,
            host: '0.0.0.0',
            port: 8081,
            protocol: 'ocpp2.0.1',
          },
          {
            id: '1',
            securityProfile: 1,
            allowUnknownChargingStations: false,
            pingInterval: 60,
            host: '0.0.0.0',
            port: 8082,
            protocol: 'ocpp2.0.1',
          },
          {
            id: '2',
            securityProfile: 2,
            allowUnknownChargingStations: false,
            pingInterval: 60,
            host: '0.0.0.0',
            port: 8443,
            protocol: 'ocpp2.0.1',
            tlsKeyFilePath:
              '/usr/local/apps/citrineos-core/Server/src/assets/certificates/leafKey.pem',
            tlsCertificateChainFilePath:
              '/usr/local/apps/citrineos-core/Server/src/assets/certificates/certChain.pem',
            rootCACertificateFilePath:
              '/usr/local/apps/citrineos-core/Server/src/assets/certificates/rootCertificate.pem',
          },
          {
            id: '3',
            securityProfile: 3,
            allowUnknownChargingStations: false,
            pingInterval: 60,
            host: '0.0.0.0',
            port: 8444,
            protocol: 'ocpp2.0.1',
            tlsKeyFilePath:
              '/usr/local/apps/citrineos-core/Server/src/assets/certificates/leafKey.pem',
            tlsCertificateChainFilePath:
              '/usr/local/apps/citrineos-core/Server/src/assets/certificates/certChain.pem',
            mtlsCertificateAuthorityKeyFilePath:
              '/usr/local/apps/citrineos-core/Server/src/assets/certificates/subCAKey.pem',
            rootCACertificateFilePath:
              '/usr/local/apps/citrineos-core/Server/src/assets/certificates/rootCertificate.pem',
          },
        ],
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
            accountKeyFilePath:
              '/usr/local/apps/citrineos-core/Server/src/assets/certificates/acme_account_key.pem',
            email: 'test@citrineos.com',
          },
        },
      },
    },
    logLevel: 2, // debug
    maxCallLengthSeconds: 5,
    maxCachingSeconds: 10,
    ocpiServer: {
      host: '0.0.0.0',
      port: 8085,
    },
  });
}
