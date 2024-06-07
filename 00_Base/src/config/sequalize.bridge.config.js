require('ts-node/register');
require('tsconfig-paths/register');
const { OcpiServerConfig } = require('./ocpi.server.config.ts');
const { Version } = require('../model/Version');
const { Endpoint } = require('../model/Endpoint');
const { Credentials } = require('../model/Credentials');

//TODO eliminate this file and use the typescript file directly

const ocpiConfig = new OcpiServerConfig();
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
