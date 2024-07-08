'use strict';

import { QueryInterface } from 'sequelize';
import {
  OcpiSequelizeInstance,
  OcpiServerConfig,
  OCPIToken,
  OCPITokensMapper,
} from '@citrineos/ocpi-base';

const _sequelize = new OcpiSequelizeInstance(new OcpiServerConfig()); // needed to init models

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (_queryInterface: QueryInterface) => {
    const token1 = {
      country_code: 'US',
      party_id: 'S44',
      uid: '123e4567-e89b-12d3-a456-426614174000',
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
    };

    const token2 = {
      country_code: 'US',
      party_id: 'XYZ',
      uid: '987e6543-e21b-65d4-b789-123456789012',
      type: 'APP_USER',
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
    };
    const ocppAuth1 = OCPITokensMapper.mapOcpiTokenToOcppAuthorization(
      token1 as OCPIToken,
    );
    const ocppAuth2 = OCPITokensMapper.mapOcpiTokenToOcppAuthorization(
      token2 as OCPIToken,
    );
    await ocppAuth1.save();
    await ocppAuth2.save();
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('Tokens', {}, {});
  },
};
