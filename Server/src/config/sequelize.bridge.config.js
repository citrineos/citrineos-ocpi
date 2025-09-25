// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import 'ts-node/register';
import { getOcpiSystemConfig } from '@citrineos/ocpi-base';

export default (async () => {
  try {
    let ocpiConfig;
    const env = process.env.OCPI_ENV || 'local'; // default to local

    if (env.toLowerCase() === 'local') {
      const { createLocalOcpiConfig } = require('./envs/local');
      ocpiConfig = getOcpiSystemConfig(createLocalOcpiConfig());
      console.log('[sequelize.bridge.config.js] Using LOCAL configuration');
    } else {
      const { createDockerOcpiConfig } = require('./envs/docker');
      ocpiConfig = getOcpiSystemConfig(createDockerOcpiConfig());
      console.log('[sequelize.bridge.config.js] Using DOCKER configuration');
    }

    const { host, port, database, username, password } = ocpiConfig.database;

    console.log('[sequelize.bridge.config.js] Loaded config for DB:', {
      host,
      port,
      database,
      username,
      password,
    });

    return {
      username,
      password,
      database,
      host,
      port,
      dialect: 'postgres',
      logging: true,
    };
  } catch (error) {
    console.error(
      '[sequelize.bridge.config.js] Failed to load bootstrap configuration:',
      error,
    );
    throw error;
  }
})();
