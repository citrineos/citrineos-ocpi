// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

import type { QueryOptions } from 'sequelize';
import { QueryInterface } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export default {
  up: async (queryInterface: QueryInterface) => {
    const partnerProfileOCPI = {
      roles: [
        {
          role: 'EMSP',
          businessDetails: {
            logo: {
              url: 'https://www.test-mobility.com/assets/brand/logo.svg',
              type: 'svg',
              width: 150,
              height: 60,
              category: 'OPERATOR',
            },
            name: 'TestMobilitySolutions',
            website: 'https://www.test-mobility.com',
          },
        },
      ],
      version: {
        version: '2.2.1',
        versionDetailsUrl:
          'http://host.docker.internal:8083/ocpi/versions/2.2.1',
      },
      endpoints: [
        {
          url: 'http://host.docker.internal:8083/ocpi/2.2.1/credentials',
          identifier: 'credentials',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/emsp/2.2.1/locations',
          identifier: 'locations_RECEIVER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/emsp/2.2.1/tariffs',
          identifier: 'tariffs_RECEIVER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/emsp/2.2.1/sessions',
          identifier: 'sessions_RECEIVER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/emsp/2.2.1/cdrs',
          identifier: 'cdrs_RECEIVER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/cpo/2.2.1/tokens',
          identifier: 'tokens_SENDER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/cpo/2.2.1/commands',
          identifier: 'commands_SENDER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/emsp/2.2.1/chargingprofiles',
          identifier: 'chargingprofiles_RECEIVER',
        },
      ],
      credentials: {
        token: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567',
        versionsUrl: 'https://our-server.citrineos.com/ocpi/versions',
      },
      serverCredentials: {
        token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9eyJzdWIiOiJwYXJ0bmVyIn0',
        versionsUrl: 'http://host.docker.internal:8083/ocpi/versions',
      },
    };

    const partnerProfileOCPICPO = {
      roles: [
        {
          role: 'CPO',
          businessDetails: {
            logo: {
              url: 'https://www.test-mobility.com/assets/brand/logo.svg',
              type: 'svg',
              width: 150,
              height: 60,
              category: 'OPERATOR',
            },
            name: 'TestMobilitySolutions',
            website: 'https://www.test-mobility.com',
          },
        },
      ],
      version: {
        version: '2.2.1',
        versionDetailsUrl:
          'http://host.docker.internal:8083/ocpi/versions/2.2.1',
      },
      endpoints: [
        {
          url: 'http://host.docker.internal:8083/ocpi/2.2.1/credentials',
          identifier: 'credentials',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/emsp/2.2.1/locations',
          identifier: 'locations_SENDER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/emsp/2.2.1/tariffs',
          identifier: 'tariffs_SENDER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/emsp/2.2.1/sessions',
          identifier: 'sessions_SENDER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/emsp/2.2.1/cdrs',
          identifier: 'cdrs_SENDER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/cpo/2.2.1/tokens',
          identifier: 'tokens_RECEIVER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/cpo/2.2.1/commands',
          identifier: 'commands_RECEIVER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/emsp/2.2.1/chargingprofiles',
          identifier: 'chargingprofiles_SENDER',
        },
      ],
      credentials: {
        token: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567',
        versionsUrl: 'https://our-server.citrineos.com/ocpi/versions',
      },
      serverCredentials: {
        token: '707b4484-0448-4baf-8acb-c79d73c75869',
        versionsUrl: 'http://host.docker.internal:8083/ocpi/versions',
      },
    };

    const partnerProfileOCPIHUB = {
      roles: [
        {
          role: 'CPO',
          businessDetails: {
            logo: {
              url: 'https://www.test-mobility.com/assets/brand/logo.svg',
              type: 'svg',
              width: 150,
              height: 60,
              category: 'OPERATOR',
            },
            name: 'TestMobilitySolutions',
            website: 'https://www.test-mobility.com',
          },
        },
      ],
      version: {
        version: '2.2.1',
        versionDetailsUrl:
          'http://host.docker.internal:8083/ocpi/versions/2.2.1',
      },
      endpoints: [
        {
          url: 'http://host.docker.internal:8083/ocpi/2.2.1/credentials',
          identifier: 'credentials',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/emsp/2.2.1/locations',
          identifier: 'locations_SENDER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/emsp/2.2.1/tariffs',
          identifier: 'tariffs_SENDER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/emsp/2.2.1/sessions',
          identifier: 'sessions_SENDER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/emsp/2.2.1/cdrs',
          identifier: 'cdrs_SENDER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/cpo/2.2.1/tokens',
          identifier: 'tokens_RECEIVER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/cpo/2.2.1/commands',
          identifier: 'commands_RECEIVER',
        },
        {
          url: 'http://host.docker.internal:8083/ocpi/emsp/2.2.1/chargingprofiles',
          identifier: 'chargingprofiles_SENDER',
        },
      ],
      credentials: {
        token: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567',
        versionsUrl: 'https://our-server.citrineos.com/ocpi/versions',
      },
      serverCredentials: {
        token: '3dff6358-637b-415f-9af7-7741d7df6672',
        versionsUrl: 'http://host.docker.internal:8083/ocpi/versions',
      },
    };

    const tenantPartner = {
      id: 1,
      tenantId: 1,
      partyId: 'TST',
      countryCode: 'US',
      partnerProfileOCPI: JSON.stringify(partnerProfileOCPI),
      createdAt: new Date('2025-08-07T17:55:00+00:00'),
      updatedAt: new Date('2025-08-07T17:55:00+00:00'),
    };

    const tenantPartnerCPO = {
      id: 2,
      tenantId: 1,
      partyId: 'CPO',
      countryCode: 'FR',
      partnerProfileOCPI: JSON.stringify(partnerProfileOCPICPO),
      createdAt: new Date('2025-08-07T17:55:00+00:00'),
      updatedAt: new Date('2025-08-07T17:55:00+00:00'),
    };

    const tenantPartnerHUB = {
      id: 3,
      tenantId: 1,
      partyId: '123',
      countryCode: 'FR',
      partnerProfileOCPI: JSON.stringify(partnerProfileOCPIHUB),
      createdAt: new Date('2025-08-07T17:55:00+00:00'),
      updatedAt: new Date('2025-08-07T17:55:00+00:00'),
    };

    await queryInterface.bulkInsert(
      'TenantPartners',
      [tenantPartner],
      {} as QueryOptions,
    );

    await queryInterface.bulkInsert(
      'TenantPartners',
      [tenantPartnerCPO],
      {} as QueryOptions,
    );

    await queryInterface.bulkInsert(
      'TenantPartners',
      [tenantPartnerHUB],
      {} as QueryOptions,
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete(
      'TenantPartners',
      { id: 1 },
      {} as QueryOptions,
    );
    await queryInterface.bulkDelete(
      'TenantPartners',
      { id: 2 },
      {} as QueryOptions,
    );
    await queryInterface.bulkDelete(
      'TenantPartners',
      { id: 3 },
      {} as QueryOptions,
    );
  },
};
