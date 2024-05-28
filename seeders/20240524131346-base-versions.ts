'use strict';
import { QueryInterface } from 'sequelize';
import { VersionNumber } from "../src/model/VersionNumber";

import 'reflect-metadata';

/** @type {import('sequelize-cli').Migration} */
export = {
  up: async (queryInterface: QueryInterface) => {
    try {
      // Insert into Versions table
      await queryInterface.bulkInsert('Versions', [
        {
          version: VersionNumber.TWO_DOT_TWO_DOT_ONE,
          url: 'https://localhost:8085/ocpi/versions/2.2.1/',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ], {});

      // Insert into Endpoints table
      await queryInterface.bulkInsert('Endpoints', [
        {
          version: VersionNumber.TWO_DOT_TWO_DOT_ONE,
          identifier: 'credentials',
          role: 'SENDER',
          url: 'https://localhost:8085/ocpi/2.2.1/credentials/',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          version: VersionNumber.TWO_DOT_TWO_DOT_ONE,
          identifier: 'locations',
          role: 'SENDER',
          url: 'https://localhost:8085/ocpi/cpo/2.2.1/locations/',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ], {});

      console.log('Data seeded successfully');
    } catch (error) {
      console.error('Error seeding data:', error);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    try {
      await queryInterface.bulkDelete('Endpoints', { version: VersionNumber.TWO_DOT_TWO_DOT_ONE }, {});
      await queryInterface.bulkDelete('Versions', { version: VersionNumber.TWO_DOT_TWO_DOT_ONE }, {});
      console.log('Data reverted successfully');
    } catch (error) {
      console.error('Error reverting data:', error);
    }
  },
};
