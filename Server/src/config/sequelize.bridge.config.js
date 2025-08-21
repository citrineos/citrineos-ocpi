/* eslint-disable */
require('ts-node/register');

module.exports = (async () => {
  const { getOcpiSystemConfig } = require('./bootstrap.config');
  const { createDockerOcpiConfig } = require('./envs/docker');

  try {
    const ocpiConfig = getOcpiSystemConfig(createDockerOcpiConfig());

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
