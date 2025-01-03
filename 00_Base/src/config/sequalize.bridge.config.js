/* eslint-disable */
require('reflect-metadata');
require('ts-node/register');
require('tsconfig-paths/register');
const { ServerConfig } = require('./ServerConfig.ts');

//TODO eliminate this file and use the typescript file directly

const ocpiConfig = new ServerConfig();
const { host, port, database, dialect, username, password, storage } =
  ocpiConfig.data.sequelize;

module.exports = {
  username,
  password,
  database,
  host,
  port,
  dialect,
  storage,
  logging: true,
};
