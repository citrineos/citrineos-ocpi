import { Sequelize } from 'sequelize-typescript';
import { ILogObj, Logger } from 'tslog';
import { Dialect } from 'sequelize';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { Service } from 'typedi';
import { Endpoint } from '../model/Endpoint';
import { ClientInformation } from '../model/ClientInformation';
import { CpoTenant } from '../model/CpoTenant';
import { BusinessDetails } from '../model/BusinessDetails';
import { ClientCredentialsRole } from '../model/ClientCredentialsRole';
import { ServerCredentialsRole } from '../model/ServerCredentialsRole';
import { Image } from '../model/Image';
import { ClientVersion } from '../model/ClientVersion';
import { ServerVersion } from '../model/ServerVersion';
import { Version } from '../model/Version';
import { VersionEndpoint } from '../model/VersionEndpoint';

export const ON_DELETE_RESTRICT = 'RESTRICT';
export const ON_DELETE_CASCADE = 'CASCADE';
export const ON_DELETE_NO_ACTION = 'NO_ACTION';
export const ON_DELETE_SET_DEFAULT = 'SET_DEFAULT';
export const ON_DELETE_SET_NULL = 'SET NULL';
import {ResponseUrl} from "../model/ResponseUrl";
import {ResponseUrlCorrelationId} from "../model/ResponseUrlCorrelationId";

@Service()
export class OcpiSequelizeInstance {
  sequelize: Sequelize;

  constructor(config: OcpiServerConfig) {
    const sequelizeLogger = new Logger<ILogObj>({
      name: OcpiSequelizeInstance.name,
    });
    sequelizeLogger.info('Creating default Sequelize instance');
    this.sequelize = new Sequelize({
      host: config.data.sequelize.host,
      port: config.data.sequelize.port,
      database: config.data.sequelize.database,
      dialect: config.data.sequelize.dialect as Dialect,
      username: config.data.sequelize.username,
      password: config.data.sequelize.password,
      storage: config.data.sequelize.storage,
      models: [
        ClientInformation,
        CpoTenant,
        ClientCredentialsRole,
        ServerCredentialsRole,
        BusinessDetails,
        Image,
        ClientVersion,
        ServerVersion,
        Endpoint,
        Version,
        VersionEndpoint,
        ResponseUrlCorrelationId
      ],
      logging: (_sql: string, _timing?: number) => {
        // TODO: Look into fixing that
        // sequelizeLogger.debug(timing, sql);
      },
    });

    if (config.data.sequelize.alter) {
      this.sequelize.sync({ alter: true }).then(() => {
        sequelizeLogger.info('Database altered');
      });
    } else if (config.data.sequelize.sync) {
      this.sequelize.sync({ force: true }).then(() => {
        sequelizeLogger.info('Database synchronized');
      });
    }
  }
}
