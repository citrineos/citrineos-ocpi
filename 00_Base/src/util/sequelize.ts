import {
  AdditionalInfo,
  Authorization,
  ChargingStation,
  IdToken,
  IdTokenAdditionalInfo,
  IdTokenInfo,
  Location,
  ModelCtor,
  Sequelize,
  StatusNotification,
} from '@citrineos/data';
import { ILogObj, Logger } from 'tslog';
import { Dialect } from 'sequelize';
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
import { OcpiToken } from '../model/OcpiToken';
import { OcpiLocation, OcpiLocationProps } from '../model/OcpiLocation';
import { OcpiEvse } from '../model/OcpiEvse';
import { OcpiConnector } from '../model/OcpiConnector';
import { ResponseUrlCorrelationId } from '../model/ResponseUrlCorrelationId';
import { OcpiTariff } from '../model/OcpiTariff';
import { SessionChargingProfile } from '../model/SessionChargingProfile';
import { AsyncJobStatus } from '../model/AsyncJobStatus';
import { ServerConfig } from '../config/ServerConfig';

export const ON_DELETE_RESTRICT = 'RESTRICT';
export const ON_DELETE_CASCADE = 'CASCADE';
export const ON_DELETE_NO_ACTION = 'NO_ACTION';
export const ON_DELETE_SET_DEFAULT = 'SET_DEFAULT';
export const ON_DELETE_SET_NULL = 'SET NULL';

@Service()
export class OcpiSequelizeInstance {
  sequelize: Sequelize;
  private logger: Logger<ILogObj>;

  constructor(config: ServerConfig) {
    this.logger = this.logger = new Logger<ILogObj>({
      name: OcpiSequelizeInstance.name,
    });
    this.logger.info('Creating default Sequelize instance');

    this.sequelize = new Sequelize({
      host: config.data.sequelize.host,
      port: config.data.sequelize.port,
      database: config.data.sequelize.database,
      dialect: config.data.sequelize.dialect as Dialect,
      username: config.data.sequelize.username,
      password: config.data.sequelize.password,
      storage: config.data.sequelize.storage,
      models: this.getModels(),
      logging: this.loggingCallback.bind(this),
    });

    this.setupModelAssociations();
    this.syncDatabase(config);
  }

  private getModels(): ModelCtor[] {
    return [
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
      OcpiLocation,
      OcpiEvse,
      OcpiConnector,
      ResponseUrlCorrelationId,
      OcpiTariff,
      SessionChargingProfile,
      OcpiToken,
      AsyncJobStatus,
      Authorization,
      IdToken, // todo make IdToken be directly exported from data
      IdTokenInfo, // todo make IdTokenInfo be directly exported from data
      IdTokenAdditionalInfo,
      AdditionalInfo,
      ChargingStation,
      StatusNotification,
      Location,
    ];
  }

  private setupModelAssociations(): void {
    Authorization.hasOne(OcpiToken, {
      foreignKey: 'authorization_id',
    });
    OcpiLocation.belongsTo(Location, {
      foreignKey: OcpiLocationProps.coreLocationId,
    });
    Location.hasOne(OcpiLocation, {
      foreignKey: OcpiLocationProps.coreLocationId,
      sourceKey: 'id',
    });
  }

  private loggingCallback(_sql: string, _timing?: number): void {
    // TODO: Look into fixing that
    // this.logger.debug(timing, sql);
  }

  private syncDatabase(config: ServerConfig): void {
    if (config.data.sequelize.alter) {
      this.sequelize.sync({ alter: true }).then(() => {
        this.logger.info('Database altered');
      });
    } else if (config.data.sequelize.sync) {
      this.sequelize.sync({ force: true }).then(() => {
        this.logger.info('Database synchronized');
      });
    }
  }
}
