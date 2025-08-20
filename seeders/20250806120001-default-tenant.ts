'use strict';

import { QueryInterface, QueryOptions } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export = {
  up: async (queryInterface: QueryInterface) => {
    const serverProfileOCPI = {
      versionDetails: [
        {
          version: '2.2.1',
          versionDetailsUrl: 'http://localhost:8085/ocpi/versions/0/2.2.1',
        },
      ],
      versionEndpoints: {
        '2.2.1': [
          {
            url: `http://localhost:8085/ocpi/2.2.1/credentials`,
            identifier: 'credentials',
          },
          {
            url: `http://localhost:8085/ocpi/2.2.1/locations`,
            identifier: 'locations_SENDER',
          },
          {
            url: `http://localhost:8085/ocpi/2.2.1/tariffs`,
            identifier: 'tariffs_SENDER',
          },
          {
            url: `http://localhost:8085/ocpi/2.2.1/sessions`,
            identifier: 'sessions_SENDER',
          },
          {
            url: `http://localhost:8085/ocpi/2.2.1/cdrs`,
            identifier: 'cdrs_SENDER',
          },
          {
            url: `http://localhost:8085/ocpi/2.2.1/tokens`,
            identifier: 'tokens_RECEIVER',
          },
          {
            url: `http://localhost:8085/ocpi/2.2.1/commands`,
            identifier: 'commands_RECEIVER',
          },
        ],
      },
      credentialsRole: {
        role: 'CPO',
        businessDetails: {
          logo: {
            url: 'https://citrineos.github.io/latest/assets/img/Icon.svg',
            type: 'svg',
            width: 200,
            height: 80,
            category: 'OPERATOR',
          },
          name: 'CitrineOSElectricVehicleSolutions',
          website: 'https://citrineos.github.io',
        },
      },
    };

    const tenant = {
      id: 1,
      name: 'default tenant',
      partyId: 'S44',
      countryCode: 'US',
      serverProfileOCPI: JSON.stringify(serverProfileOCPI),
      createdAt: new Date('2025-08-07T17:55:00+00:00'),
      updatedAt: new Date('2025-08-07T17:55:00+00:00'),
    };
    await queryInterface.bulkInsert('Tenants', [tenant], {} as QueryOptions);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('Tenants', { id: 1 }, {} as QueryOptions);
  },
};
