'use strict';
import { QueryInterface } from 'sequelize';
import { ModuleId, VersionNumber } from '@citrineos/ocpi-base';

import 'reflect-metadata';

/** @type {import('sequelize-cli').Migration} */
export = {
  up: async (queryInterface: QueryInterface) => {
    const baseClientUrl = 'http://localhost:8085';

    const resetIndexes = async (tableName: string) => {
      // Reset the sequence
      await queryInterface.sequelize.query(`
          SELECT setval('"${tableName}_id_seq"', (SELECT MAX(id) FROM "${tableName}"));
      `);
    };

    const moduleList: ModuleId[] = [
      ModuleId.Credentials,
      ModuleId.Versions,
      ModuleId.Cdrs,
      ModuleId.ChargingProfiles,
      ModuleId.Commands,
      ModuleId.Locations,
      ModuleId.Sessions,
      ModuleId.Tariffs,
      ModuleId.Tokens,
    ];

    try {
      // Insert into Versions table
      const versions: any = await queryInterface.bulkInsert(
        'Versions',
        [
          {
            createdAt: new Date(),
            updatedAt: new Date(),
            version: VersionNumber.TWO_DOT_TWO_DOT_ONE,
            url: `${baseClientUrl}/ocpi/versions/2.2.1/`,
          },
        ],
        { returning: true } as any,
      );
      const version = versions[0];
      await resetIndexes('Versions');
      await queryInterface.bulkInsert(
        'VersionEndpoints',
        moduleList.map((module) => ({
          createdAt: new Date(),
          updatedAt: new Date(),
          versionId: version.id,
          identifier: module,
          role: 'SENDER',
          url: `${baseClientUrl}/ocpi/2.2.1/${module}/`,
        })),
      );
      await resetIndexes('VersionEndpoints');
      console.log('Data seeded successfully');
    } catch (error) {
      console.error('Error seeding data:', error);
    }
  },

  down: async (_queryInterface: QueryInterface) => {
    try {
      console.log('Data reverted successfully');
    } catch (error) {
      console.error('Error reverting data:', error);
    }
  },
};
