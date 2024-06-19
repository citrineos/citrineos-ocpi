'use strict';

import { QueryInterface } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {

  up: async (queryInterface:QueryInterface) => {
    await queryInterface.bulkInsert('Tokens', [
      {
        country_code: 'US',
        party_id: 'S44',
        uid: 'token123',
        type: 'RFID',
        contract_id: 'contract_001',
        visual_number: 'VIS001',
        issuer: 'Issuer1',
        group_id: 'group_001',
        valid: true,
        whitelist: 'ALWAYS',
        language: 'EN',
        default_profile_type: 'default',
        energy_contract: null,
        last_updated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        country_code: 'US',
        party_id: 'XYZ',
        uid: '987e6543-e21b-65d4-b789-123456789012',
        type: 'APP',
        contract_id: 'contract_002',
        visual_number: 'VIS002',
        issuer: 'Issuer2',
        group_id: 'group_002',
        valid: false,
        whitelist: 'ALWAYS',
        language: 'EN',
        default_profile_type: 'premium',
        energy_contract: null,
        last_updated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Add more sample data as needed
    ], {});
  },

  down: async (queryInterface :QueryInterface) => {
    await queryInterface.bulkDelete('Tokens', {}, {});
  },
};
