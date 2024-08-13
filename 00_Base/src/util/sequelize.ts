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
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.logger = this.logger = new Logger<ILogObj>({
      name: OcpiSequelizeInstance.name,
    });
    this.config = config;
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
  }

  public async initializeSequelize(): Promise<void> {
    let retryCount = 0;
    const maxRetries = this.config.data.sequelize.maxRetries ?? 5;
    const retryDelay = this.config.data.sequelize.retryDelay ?? 5000;
    while (retryCount < maxRetries) {
      try {
        await this.sequelize!.authenticate();
        this.logger.info(
          'Database connection has been established successfully',
        );

        this.setupModelAssociations();
        this.syncDatabase();

        break;
      } catch (error) {
        retryCount++;
        this.logger.error(
          `Failed to connect to the database (attempt ${retryCount}/${maxRetries}):`,
          error,
        );
        if (retryCount < maxRetries) {
          this.logger.info(`Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } else {
          this.logger.error(
            'Max retries reached. Unable to establish database connection.',
          );
        }
      }
    }
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

  private syncDatabase(): void {
    if (this.config.data.sequelize.alter) {
      this.sequelize.sync({ alter: true }).then(() => {
        this.logger.info('Database altered');
      });
    } else if (this.config.data.sequelize.sync) {
      this.sequelize.sync({ force: true }).then(() => {
        this.logger.info('Database synchronized');
      });
    }
  }
}
