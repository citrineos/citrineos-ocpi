// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { OCPP2_0_1, OCPPVersion } from '@citrineos/base';
import {
  Env,
  ServerConfig,
  ServerConfigUtilCertificateAuthorityChargingStationCAName,
  ServerConfigUtilCertificateAuthorityV2gCAHubjectIsoVersion,
  ServerConfigUtilCertificateAuthorityV2gCAName,
} from '@citrineos/ocpi-base';
import path from 'path';

export const swarmConfig: ServerConfig = {
  env: Env.DEVELOPMENT,
  centralSystem: {
    host: '0.0.0.0',
    port: 8080,
  },
  modules: {
    certificates: {
      endpointPrefix: 'certificates',
      host: '0.0.0.0',
      port: 8083,
    },
    configuration: {
      heartbeatInterval: 60,
      bootRetryInterval: 15,
      unknownChargerStatus: OCPP2_0_1.RegistrationStatusEnumType.Accepted,
      getBaseReportOnPending: true,
      bootWithRejectedVariables: true,
      autoAccept: true,
      endpointPrefix: 'configuration',
      host: '0.0.0.0',
      port: 8084,
    },
    evdriver: {
      endpointPrefix: 'evdriver',
      host: '0.0.0.0',
      port: 8085,
    },
    monitoring: {
      endpointPrefix: 'monitoring',
      host: '0.0.0.0',
      port: 8086,
    },
    reporting: {
      endpointPrefix: 'reporting',
      host: '0.0.0.0',
      port: 8087,
    },
    smartcharging: {
      endpointPrefix: 'smartcharging',
      host: '0.0.0.0',
      port: 8088,
    },
    tenant: {
      endpointPrefix: 'tenant',
      host: '0.0.0.0',
      port: 8090,
    },
    transactions: {
      endpointPrefix: 'transactions',
      host: '0.0.0.0',
      port: 8089,
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
        url: 'amqp://guest:guest@amqp-broker:5672',
        exchange: 'citrineos',
      },
    },
    swagger: {
      path: '/docs',
      logoPath: path.resolve(path.dirname(__filename), '../../assets/logo.png'),
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
          protocol: OCPPVersion.OCPP2_0_1,
        },
        {
          id: '1',
          securityProfile: 1,
          allowUnknownChargingStations: false,
          pingInterval: 60,
          host: '0.0.0.0',
          port: 8082,
          protocol: OCPPVersion.OCPP2_0_1,
        },
      ],
    },
    certificateAuthority: {
      v2gCA: {
        name: ServerConfigUtilCertificateAuthorityV2gCAName.HUBJECT,
        hubject: {
          baseUrl: 'https://open.plugncharge-test.hubject.com',
          tokenUrl:
            'https://hubject.stoplight.io/api/v1/projects/cHJqOjk0NTg5/nodes/6bb8b3bc79c2e-authorization-token',
          isoVersion:
            ServerConfigUtilCertificateAuthorityV2gCAHubjectIsoVersion.ISO15118_2,
        },
      },
      chargingStationCA: {
        name: ServerConfigUtilCertificateAuthorityChargingStationCAName.ACME,
        acme: {
          env: Env.STAGING,
          accountKeyFilePath: path.resolve(
            path.dirname(__filename),
            '../../assets/certificates/acme_account_key.pem',
          ),
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
};
