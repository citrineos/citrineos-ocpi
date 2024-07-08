'use strict';

import {QueryInterface, QueryOptions} from 'sequelize';
import {OCPIToken, OCPITokensMapper} from '@citrineos/ocpi-base';
import {AuthorizationData, IdTokenInfoType, IdTokenType} from '@citrineos/base';

/** @type {import('sequelize-cli').Migration} */
module.exports = {

  up: async (queryInterface: QueryInterface) => {
    const insertToken = async (tokenType: IdTokenType) => {
      const result = await queryInterface.bulkInsert('IdTokens', [tokenType], {
        returning: true,
      } as QueryOptions)
      console.log('TokenType result', result);
      return result as any[]
    }

    const insertTokenInfo = async (tokenInfo: IdTokenInfoType) => {
      const tokenList = await insertToken(tokenInfo.groupIdToken!)
      if (tokenList && tokenList[0]) {
        (tokenInfo as any).groupIdTokenId = tokenList[0].id;
      }

      const result = await queryInterface.bulkInsert('IdTokenInfos', [tokenInfo], {
        returning: true,
      } as QueryOptions);
      console.log('IdTokenInfoType result', result);
      return result as any[]
    }

    const insertAuthorization = async (authorization: AuthorizationData) => {
      const idToken = insertToken(authorization.idToken!);
      const gropuIdToken = insertTokenInfo(authorization.idTokenInfo!);
      (authorization as any).idTokenId = (await idToken)[0].id;
      (authorization as any).idTokenInfoId = (await gropuIdToken)[0].id;
      const result = await queryInterface.bulkInsert('Authorizations', [authorization], {
        returning: true,
      } as QueryOptions);
      console.log('IdTokenInfoType result', result);
      return result as any[]
    }

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
    }

    const token2 = {
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
    }

    const ocppAuth1 = OCPITokensMapper.mapOcpiTokenToOcppAuthorization(token1 as OCPIToken)
    const ocppAuth2 = OCPITokensMapper.mapOcpiTokenToOcppAuthorization(token2 as OCPIToken)
    await insertAuthorization(ocppAuth1);
    await insertAuthorization(ocppAuth2);

    await queryInterface.bulkInsert('Tokens', [token1, token2], {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('Tokens', {}, {});
  },


};
