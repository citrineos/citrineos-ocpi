'use strict';

import { QueryInterface, QueryOptions } from 'sequelize';
import { OcpiTokensMapper, TokenDTO } from '@citrineos/ocpi-base';
import { AdditionalInfo, Authorization, IdToken } from '@citrineos/data';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (_queryInterface: QueryInterface) => {
    const token1 = {
      country_code: 'US',
      party_id: 'MSP',
      uid: '1',
      type: 'APP_USER',
      contract_id: 'contract_001',
      visual_number: 'VIS001',
      issuer: 'Issuer001',
      group_id: 'group_001',
      valid: true,
      whitelist: 'ALWAYS',
      language: 'EN',
      default_profile_type: 'premium',
      energy_contract: {
        supplier_name: 'Supplier001',
        contract_id: 'contract_001',
      },
      last_updated: new Date(),
    };

    const ocppAuth = OcpiTokensMapper.mapOcpiTokenToOcppAuthorization(
      token1 as TokenDTO,
    );

    const additionalInfoRecord: any = await _queryInterface.bulkInsert(
      'AdditionalInfos',
      [
        {
          ...ocppAuth.idToken.additionalInfo![0],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {
        returning: true,
        ignoreDuplicates: true,
      } as QueryOptions,
    );

    const idTokenRecord: any = await _queryInterface.bulkInsert(
      'IdTokens',
      [
        {
          id: 1,
          idToken: ocppAuth.idToken.idToken,
          type: ocppAuth.idToken.type,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {
        returning: true,
        ignoreDuplicates: true,
      } as QueryOptions,
    );

    const groupIdTokenRecord: any = await _queryInterface.bulkInsert(
      'IdTokens',
      [
        {
          ...ocppAuth.idTokenInfo?.groupIdToken,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {
        returning: true,
        ignoreDuplicates: true,
      } as QueryOptions,
    );

    if (!groupIdTokenRecord || groupIdTokenRecord.length === 0) {
      groupIdTokenRecord[0] = (
        await IdToken.findOne({
          where: {
            idToken: ocppAuth.idTokenInfo?.groupIdToken?.idToken,
            type: ocppAuth.idTokenInfo?.groupIdToken?.type,
          },
        })
      )?.dataValues;
    }

    const idTokenInfoRecord: any = await _queryInterface.bulkInsert(
      'IdTokenInfos',
      [
        {
          status: ocppAuth.idTokenInfo?.status,
          cacheExpiryDateTime: ocppAuth.idTokenInfo?.cacheExpiryDateTime,
          chargingPriority: ocppAuth.idTokenInfo?.chargingPriority,
          language1: ocppAuth.idTokenInfo?.language1,
          language2: ocppAuth.idTokenInfo?.language2,
          personalMessage: ocppAuth.idTokenInfo?.personalMessage,
          groupIdTokenId: groupIdTokenRecord[0].id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {
        returning: true,
        ignoreDuplicates: true,
      } as QueryOptions,
    );

    if (!idTokenRecord || idTokenRecord.length === 0) {
      idTokenRecord[0] = (
        await IdToken.findOne({
          where: {
            idToken: ocppAuth.idToken.idToken,
            type: ocppAuth.idToken.type,
          },
        })
      )?.dataValues;
    }

    if (!additionalInfoRecord || additionalInfoRecord.length === 0) {
      additionalInfoRecord[0] = (
        await AdditionalInfo.findOne({
          where: {
            additionalIdToken:
              ocppAuth.idToken.additionalInfo![0].additionalIdToken,
            type: ocppAuth.idToken.additionalInfo![0].type,
          },
        })
      )?.dataValues;
    }

    await _queryInterface.bulkInsert(
      'IdTokenAdditionalInfos',
      [
        {
          idTokenId: idTokenRecord[0].id,
          additionalInfoId: additionalInfoRecord[0].id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {
        returning: true,
        ignoreDuplicates: true,
      } as QueryOptions,
    );

    const authorizationRecord: any = await _queryInterface.bulkInsert(
      'Authorizations',
      [
        {
          idTokenId: idTokenRecord[0].id,
          idTokenInfoId: idTokenInfoRecord[0].id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {
        returning: true,
        ignoreDuplicates: true,
      } as QueryOptions,
    );

    if (!authorizationRecord || authorizationRecord.length === 0) {
      authorizationRecord[0] = (
        await Authorization.findOne({
          where: {
            idTokenId: idTokenRecord[0].id,
            idTokenInfoId: idTokenInfoRecord[0].id,
          },
        })
      )?.dataValues;
    }

    await _queryInterface.bulkInsert(
      'OcpiTokens',
      [
        {
          authorization_id: authorizationRecord[0].id,
          country_code: token1.country_code,
          party_id: token1.party_id,
          type: token1.type,
          visual_number: token1.visual_number,
          issuer: token1.issuer,
          whitelist: token1.whitelist,
          default_profile_type: token1.default_profile_type,
          energy_contract: JSON.stringify(token1.energy_contract),
          last_updated: token1.last_updated,
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
    await queryInterface.bulkDelete('Authorizations', {}, {
      cascade: true,
    } as QueryOptions);
    await queryInterface.bulkDelete('IdTokenInfos', {}, {
      cascade: true,
    } as QueryOptions);
    await queryInterface.bulkDelete('IdTokens', {}, {
      cascade: true,
    } as QueryOptions);
    await queryInterface.bulkDelete('IdTokenAdditionalInfos', {}, {
      cascade: true,
    } as QueryOptions);
    await queryInterface.bulkDelete('AdditionalInfos', {}, {
      cascade: true,
    } as QueryOptions);
    await queryInterface.bulkDelete('OcpiTokens', {}, {
      cascade: true,
    } as QueryOptions);
  },
};
