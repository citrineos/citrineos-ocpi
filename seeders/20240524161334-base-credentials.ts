'use strict';

import {QueryInterface} from 'sequelize';
import {CredentialsRole} from '../Server/src/model/CredentialsRole';

/** @type {import('sequelize-cli').Migration} */
export = {
  up: async (queryInterface: QueryInterface) => {
    try {
      // Insert into Credentials table
      await queryInterface.bulkInsert(
        'Credentials',
        [
          {
            token: 'example-token',
            url: 'https://localhost:8086/ocpi/versions/',
            roles: JSON.stringify([
              {
                role: 'CPO',
                party_id: 'EXA',
                country_code: 'NL',
                business_details: {name: 'Example Operator'},
              } as CredentialsRole,
            ]),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {},
      );

      console.log('Credentials data seeded successfully');
    } catch (error) {
      console.error('Error seeding credentials data:', error);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    try {
      await queryInterface.bulkDelete(
        'Credentials',
        {token: 'example-token'},
        {},
      );
      console.log('Credentials data reverted successfully');
    } catch (error) {
      console.error('Error reverting credentials data:', error);
    }
  },
};
