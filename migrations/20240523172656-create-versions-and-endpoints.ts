'use strict';

/** @type {import('sequelize-cli').Migration} */
import {QueryInterface} from 'sequelize';

/*
  NOTE: leaving as example, but the base Models / Tables should be created via `npm run sync-db`
  which will call sequelize.sync({alter: true}) and automatically apply schema changes without
  dropping the data. We should let the ORM perform schema changes on its own whereever possible
  and only create custom migrations where one is needed
 */
export = {
  up: async (queryInterface: QueryInterface) => {
    // await queryInterface.createTable('Versions', {
    //   version: {
    //     type: DataTypes.STRING,
    //     allowNull: false,
    //     primaryKey: true,
    //   },
    //   url: {
    //     type: DataTypes.STRING,
    //     allowNull: false,
    //   },
    //   createdAt: {
    //     type: DataTypes.DATE,
    //     allowNull: false,
    //   },
    //   updatedAt: {
    //     type: DataTypes.DATE,
    //     allowNull: false,
    //   },
    // });
    //
    // await queryInterface.createTable('Endpoints', {
    //   id: {
    //     type: DataTypes.INTEGER,
    //     autoIncrement: true,
    //     primaryKey: true,
    //   },
    //   version: {
    //     type: DataTypes.STRING,
    //     references: {
    //       model: 'Versions',
    //       key: 'version',
    //     },
    //     allowNull: false,
    //     onUpdate: 'CASCADE',
    //     onDelete: 'CASCADE',
    //   },
    //   identifier: {
    //     type: DataTypes.STRING,
    //     allowNull: false,
    //   },
    //   role: {
    //     type: DataTypes.STRING,
    //     allowNull: false,
    //   },
    //   url: {
    //     type: DataTypes.STRING,
    //     allowNull: false,
    //   },
    //   createdAt: {
    //     type: DataTypes.DATE,
    //     allowNull: false,
    //   },
    //   updatedAt: {
    //     type: DataTypes.DATE,
    //     allowNull: false,
    //   },
    // });
  },

  down: async (queryInterface: QueryInterface) => {
    // await queryInterface.dropTable('Endpoints');
    // await queryInterface.dropTable('Versions');
  },
};
