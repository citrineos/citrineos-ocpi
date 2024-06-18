import { Sequelize } from 'sequelize-typescript';
import { ILogObj, Logger } from 'tslog';
import { Dialect } from 'sequelize';
import { Version } from '../model/Version';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { Endpoint } from '../model/Endpoint';

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
      models: [Version, Endpoint],
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
