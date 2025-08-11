'use strict';

import { QueryInterface, QueryOptions } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export = {
  up: async (queryInterface: QueryInterface) => {
    const partnerProfileOCPI = {
      roles: [
        {
          role: 'EMSP',
          businessDetails: {
            logo: {
              url: 'https://www.greencharge-mobility.com/assets/brand/logo.svg',
              type: 'image/svg+xml',
              width: 150,
              height: 60,
              category: 'OPERATOR',
            },
            name: 'GreenChargeMobilitySolutions',
            website: 'https://www.greencharge-mobility.com',
          },
        },
        {
          role: 'HUB',
          businessDetails: {
            name: 'EVHubServices',
            website: 'https://www.evhub-services.com',
          },
        },
      ],
      version: {
        version: '2.2.1',
        versionDetailsUrl: 'https://partner-api.emobility.com/ocpi/versions/2.2.1',
      },
      endpoints: [
        {
          url: 'https://partner-api.emobility.com/ocpi/2.2.1/credentials',
          identifier: 'credentials',
        },
        {
          url: 'https://partner-api.emobility.com/ocpi/2.2.1/emsp/locations',
          identifier: 'locations',
        },
        {
          url: 'https://partner-api.emobility.com/ocpi/2.2.1/emsp/tariffs',
          identifier: 'tariffs',
        },
        {
          url: 'https://partner-api.emobility.com/ocpi/2.2.1/emsp/sessions',
          identifier: 'sessions',
        },
        {
          url: 'https://partner-api.emobility.com/ocpi/2.2.1/emsp/cdrs',
          identifier: 'cdrs',
        },
        {
          url: 'https://partner-api.emobility.com/ocpi/2.2.1/emsp/tokens',
          identifier: 'tokens',
        },
        {
          url: 'https://partner-api.emobility.com/ocpi/2.2.1/emsp/commands',
          identifier: 'commands',
        },
        {
          url: 'https://partner-api.emobility.com/ocpi/2.2.1/emsp/chargingprofiles',
          identifier: 'chargingprofiles',
        },
      ],
      credentials: {
        token: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567',
        versionsUrl: 'https://our-server.citrineos.com/ocpi/versions',
      },
      serverCredentials: {
        token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9eyJzdWIiOiJwYXJ0bmVyIn0',
        versionsUrl: 'https://partner-api.emobility.com/ocpi/versions',
      },
    };

    const tenantPartner = {
      id: 1,
      tenantId: 0,
      partyId: 'TST',
      countryCode: 'US',
      partnerProfileOCPI: JSON.stringify(partnerProfileOCPI),
      createdAt: new Date('2025-08-07T17:55:00+00:00'),
      updatedAt: new Date('2025-08-07T17:55:00+00:00'),
    };

    await queryInterface.bulkInsert(
      'TenantPartners',
      [tenantPartner],
      {} as QueryOptions,
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete(
      'TenantPartners',
      { id: 1 },
      {} as QueryOptions,
    );
  },
};