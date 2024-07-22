'use strict';

/** @type {import('sequelize-cli').Migration} */
import { QueryInterface } from 'sequelize';
import {
  createViewTransactionsWithPartyIdAndCountryCodeSql,
  dropViewTransactionsWithPartyIdAndCountryCodeSql,
} from '@citrineos/ocpi-base';


export = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(createViewTransactionsWithPartyIdAndCountryCodeSql);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(dropViewTransactionsWithPartyIdAndCountryCodeSql);
  },
};
