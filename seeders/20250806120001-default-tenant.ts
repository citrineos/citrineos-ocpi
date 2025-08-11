'use strict';

import { QueryInterface, QueryOptions } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export = {
  up: async (queryInterface: QueryInterface) => {
    const serverProfileOCPI = {
      versionDetails: {
        '2.2.1': [
          {
            url: `http://localhost:8085/ocpi/2.2.1/credentials`,
            identifier: 'credentials',
          },
          {
            url: `http://localhost:8085/ocpi/2.2.1/locations`,
            identifier: 'locations',
          },
          {
            url: `http://localhost:8085/ocpi/2.2.1/tariffs`,
            identifier: 'tariffs',
          },
          {
            url: `http://localhost:8085/ocpi/2.2.1/sessions`,
            identifier: 'sessions',
          },
          {
            url: `http://localhost:8085/ocpi/2.2.1/cdrs`,
            identifier: 'cdrs',
          },
          {
            url: `http://localhost:8085/ocpi/2.2.1/tokens`,
            identifier: 'tokens',
          },
          {
            url: `http://localhost:8085/ocpi/2.2.1/commands`,
            identifier: 'commands',
          },
        ],
      },
      credentialsRole: {
        role: 'CPO',
        businessDetails: {
          logo: {
            url: 'https://www.citrineos.com/assets/logo.png',
            type: 'image/png',
            width: 200,
            height: 80,
            category: 'OPERATOR',
          },
          name: 'CitrineOSElectricVehicleSolutions',
          website: 'https://www.citrineos.com',
        },
      },
    };

    const tenant = {
      id: 0,
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
    await queryInterface.bulkDelete('Tenants', { id: 0 }, {} as QueryOptions);
  },
};
