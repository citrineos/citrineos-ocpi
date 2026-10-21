// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

import type { QueryOptions } from 'sequelize';
import { QueryInterface } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export default {
  up: async (queryInterface: QueryInterface) => {
    const businessDetails = {
      logo: {
        url: 'https://citrineos.github.io/latest/assets/img/Icon.svg',
        type: 'svg',
        width: 200,
        height: 80,
        category: 'OPERATOR',
      },
      name: 'CitrineOSElectricVehicleSolutions',
      website: 'https://citrineos.github.io',
    };

    // Every interface the server mounts, for both roles we play. The cpo/emsp path
    // segment is cosmetic (no controller reads it), except Commands (mounted on /cpo
    // only) and ChargingProfiles (mounted on /emsp only).
    const endpoint = (path: string, identifier: string) => ({
      url: `http://localhost:8085/ocpi/${path}`,
      identifier,
    });
    const serverProfileOCPI = {
      versionDetails: [
        {
          version: '2.2.1',
          versionDetailsUrl: 'http://localhost:8085/ocpi/versions/1/2.2.1',
        },
      ],
      versionEndpoints: {
        '2.2.1': [
          endpoint('2.2.1/credentials', 'credentials'),
          // CPO side
          endpoint('cpo/2.2.1/locations', 'locations_SENDER'),
          endpoint('cpo/2.2.1/tariffs', 'tariffs_SENDER'),
          endpoint('cpo/2.2.1/sessions', 'sessions_SENDER'),
          endpoint('cpo/2.2.1/cdrs', 'cdrs_SENDER'),
          endpoint('cpo/2.2.1/tokens', 'tokens_RECEIVER'),
          endpoint('cpo/2.2.1/commands', 'commands_RECEIVER'),
          endpoint('emsp/2.2.1/chargingprofiles', 'chargingprofiles_RECEIVER'),
          // eMSP side
          endpoint('emsp/2.2.1/locations', 'locations_RECEIVER'),
          endpoint('emsp/2.2.1/tariffs', 'tariffs_RECEIVER'),
          endpoint('emsp/2.2.1/sessions', 'sessions_RECEIVER'),
          endpoint('emsp/2.2.1/cdrs', 'cdrs_RECEIVER'),
          endpoint('emsp/2.2.1/tokens', 'tokens_SENDER'),
        ],
      },
      // An array (ServerProfileSchema), one entry per role: RegistrationMapper .map()s it.
      credentialsRoles: [
        { role: 'CPO', businessDetails },
        { role: 'EMSP', businessDetails },
      ],
    };

    try {
      const tenant = {
        id: 1,
        name: 'Default Tenant',
        partyId: 'ZET',
        countryCode: 'FR',
        serverProfileOCPI: JSON.stringify(serverProfileOCPI),
        createdAt: new Date('2025-08-07T17:55:00+00:00'),
        updatedAt: new Date('2025-08-07T17:55:00+00:00'),
      };
      await queryInterface.bulkInsert('Tenants', [tenant], {} as QueryOptions);
    } catch (error) {
      console.error('Error inserting tenant, will attempt update:', error);

      const tenantUpdate = {
        partyId: 'ZET',
        countryCode: 'FR',
        serverProfileOCPI: JSON.stringify(serverProfileOCPI),
        updatedAt: new Date('2025-08-07T17:55:00+00:00'),
      };
      try {
        await queryInterface.bulkUpdate(
          'Tenants',
          tenantUpdate,
          { id: 1 },
          {} as QueryOptions,
        );
      } catch (updateError) {
        console.error('Error updating tenant:', updateError);
      }
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('Tenants', { id: 1 }, {} as QueryOptions);
  },
};
