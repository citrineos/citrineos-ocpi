'use strict';
import { QueryInterface, QueryOptions } from 'sequelize';

import 'reflect-metadata';

/** @type {import('sequelize-cli').Migration} */
export = {
  up: async (queryInterface: QueryInterface) => {
    const tariffRecord: any = await queryInterface.bulkInsert(
      'Tariffs',
      [
        {
          stationId: 1,
          currency: 'USD',
          pricePerKwh: 0,
          pricePerMin: 0.0125,
          pricePerSession: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {
        returning: true,
        ignoreDuplicates: true,
      } as QueryOptions,
    );

    await queryInterface.bulkInsert(
      'OcpiTariffs',
      [
        {
          countryCode: 'US',
          partyId: 'CPO',
          coreTariffId: tariffRecord[0].id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {
        returning: true,
        ignoreDuplicates: true,
      } as QueryOptions,
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('OcpiTariffs', {}, {
      truncate: true,
      cascade: true,
    } as QueryOptions);

    await queryInterface.bulkDelete('Tariffs', {}, {
      truncate: true,
      cascade: true,
    } as QueryOptions);
  },
};
