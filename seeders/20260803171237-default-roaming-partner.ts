// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

import type { QueryOptions } from 'sequelize';
import { QueryInterface } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export default {
  up: async (queryInterface: QueryInterface) => {
    const roamingPartner = {
      id: 1,
      tenantPartnerId: 3,
      partyId: 'CPO',
      countryCode: 'FR',
      createdAt: new Date('2025-08-07T17:55:00+00:00'),
      updatedAt: new Date('2025-08-07T17:55:00+00:00'),
    };

    const roamingPartnerBTU = {
      id: 2,
      tenantPartnerId: 3,
      partyId: 'BTU',
      countryCode: 'FR',
      createdAt: new Date('2025-08-07T17:55:00+00:00'),
      updatedAt: new Date('2025-08-07T17:55:00+00:00'),
    };

    await queryInterface.bulkInsert(
      'RoamingPartners',
      [roamingPartner],
      {} as QueryOptions,
    );

    await queryInterface.bulkInsert(
      'RoamingPartners',
      [roamingPartnerBTU],
      {} as QueryOptions,
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete(
      'RoamingPartners',
      { id: 1 },
      {} as QueryOptions,
    );
    await queryInterface.bulkDelete(
      'RoamingPartners',
      { id: 2 },
      {} as QueryOptions,
    );
  },
};
