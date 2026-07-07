// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { OcpiConfigInput } from '../ocpi.types.js';
import { defineOcpiConfig } from '../defineOcpiConfig.js';

const minimalConfig: OcpiConfigInput = {
  env: 'development',
  ocpiServer: { host: '0.0.0.0', port: 8085 },
  ocpiModules: {
    credentials: { endpointPrefix: '/credentials' },
    versions: { endpointPrefix: '/versions' },
    locations: { endpointPrefix: '/locations' },
    sessions: { endpointPrefix: '/sessions' },
    cdrs: { endpointPrefix: '/cdrs' },
    tokens: { endpointPrefix: '/tokens' },
    tariffs: { endpointPrefix: '/tariffs' },
    chargingProfiles: { endpointPrefix: '/chargingprofiles' },
    commands: { endpointPrefix: '/commands' },
  },
  database: {
    host: 'localhost',
    port: 5432,
    database: 'citrine',
    username: 'citrine',
    password: 'citrine',
  },
  cache: { memory: true },
  graphql: { endpoint: 'http://localhost:8080/v1/graphql' },
  commands: {
    timeout: 30,
    ocpiBaseUrl: 'http://localhost:8085/ocpi',
    coreHeaders: {},
    ocpp1_6: {
      remoteStartTransactionRequestUrl: 'http://localhost/remoteStart',
      remoteStopTransactionRequestUrl: 'http://localhost/remoteStop',
      unlockConnectorRequestUrl: 'http://localhost/unlock',
    },
    ocpp2_0_1: {
      requestStartTransactionRequestUrl: 'http://localhost/requestStart',
      requestStopTransactionRequestUrl: 'http://localhost/requestStop',
      unlockConnectorRequestUrl: 'http://localhost/unlock',
    },
  },
  messageBroker: {
    amqp: { url: 'amqp://guest:guest@localhost:5672', exchange: 'ocpi' },
  },
  logLevel: 2,
  defaultPageLimit: 50,
  maxPageLimit: 1000,
};

describe('defineOcpiConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('preserves leading zeros in gireve partyId env var', () => {
    process.env.CITRINEOS_OCPI_GIREVE_COUNTRYCODE = 'FR';
    process.env.CITRINEOS_OCPI_GIREVE_PARTYID = '007';

    const config = defineOcpiConfig(minimalConfig);

    expect(config.gireve?.countryCode).toBe('FR');
    expect(config.gireve?.partyId).toBe('007');
  });
});
