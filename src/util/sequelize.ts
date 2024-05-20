import {Sequelize} from "sequelize-typescript";
import {SystemConfig} from "@citrineos/base";
import {ILogObj, Logger} from "tslog";
import {Dialect} from "sequelize";
import {Credentials} from "../model/Credentials";
import {Version} from "../model/Version";
import {singleton} from "tsyringe";
import {OcpiServerConfig} from "../config/ocpi.server.config";

@singleton()
export class OcpiSequelizeInstance {

  sequelize: Sequelize;

  constructor(config: OcpiServerConfig) {
    const sequelizeLogger = new Logger<ILogObj>({name: OcpiSequelizeInstance.name});

    sequelizeLogger.info('Creating default Sequelize instance');

    this.sequelize = new Sequelize({
      host: config.sequelize.host,
      port: config.sequelize.port,
      database: config.sequelize.database,
      dialect: config.sequelize.dialect as Dialect,
      username: config.sequelize.username,
      password: config.sequelize.password,
      storage: config.sequelize.storage,
      models: [
        Credentials,
        Version
      ],
      logging: (_sql: string, _timing?: number) => {
        // TODO: Look into fixing that
        // sequelizeLogger.debug(timing, sql);
      },
    });

    if (config.sequelize.alter) {
      this.sequelize.sync({alter: true}).then(() => {
        sequelizeLogger.info('Database altered');
      });
    } else if (config.sequelize.sync) {
      this.sequelize.sync({force: true}).then(() => {
        sequelizeLogger.info('Database synchronized');
      });
    }
  }
}
