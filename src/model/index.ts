import {Sequelize} from 'sequelize-typescript';
import {OcpiServerConfig} from "../config/ocpi.server.config";
import {BusinessDetails} from "./BusinessDetails";

const ocpiConfig = new OcpiServerConfig();
const {host, port, database, dialect, username, password, storage} =
  ocpiConfig.data.sequelize;

const sequelize = new Sequelize({
  username,
  password,
  database,
  host,
  port,
  dialect,
  storage,
  logging: true,
  models: [
    BusinessDetails
  ]
});

sequelize.sync();

export {sequelize, BusinessDetails};
