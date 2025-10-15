// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

// import {
//   OcpiSequelizeInstance,
//   getOcpiSystemConfig,
// } from '@citrineos/ocpi-base';

// // Create a minimal OCPI config for database sync using local environment
// const ocpiConfig = getOcpiSystemConfig();
// const ocpiSequelizeInstance = new OcpiSequelizeInstance(ocpiConfig);
// const sequelize = ocpiSequelizeInstance.sequelize;

// const syncDatabase = async () => {
//   try {
//     await sequelize.sync({ alter: true }); // Use { force: true } for dropping and recreating tables
//     console.log('Database synchronized successfully');
//   } catch (error) {
//     console.error('Error synchronizing database:', error);
//   }
// };

// syncDatabase().then();
