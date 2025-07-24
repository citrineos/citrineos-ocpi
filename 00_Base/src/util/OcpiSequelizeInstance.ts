import {
  AdditionalInfo,
  Authorization,
  ChargingStation,
  Evse,
  IdToken,
  IdTokenAdditionalInfo,
  IdTokenInfo,
  Location,
  ModelCtor,
  Reservation,
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
import { OcpiReservation } from '../model/OcpiReservation';
import { ResponseUrlCorrelationId } from '../model/ResponseUrlCorrelationId';
import { OcpiTariff } from '../model/OcpiTariff';
import { SessionChargingProfile } from '../model/SessionChargingProfile';
import { OcpiConfig } from '../config/ocpi.types';
import { ServerConfig, Env } from '../config/ServerConfig';

export const ON_DELETE_RESTRICT = 'RESTRICT';
export const ON_DELETE_CASCADE = 'CASCADE';
export const ON_DELETE_NO_ACTION = 'NO_ACTION';
export const ON_DELETE_SET_DEFAULT = 'SET_DEFAULT';
export const ON_DELETE_SET_NULL = 'SET NULL';

/**
 * Helper function to create a minimal ServerConfig from OcpiConfig
 * for compatibility with existing repositories
 */
function createCompatibleServerConfig(ocpiConfig: OcpiConfig): ServerConfig {
  return {
    env: ocpiConfig.env === 'development' ? Env.DEVELOPMENT : Env.PRODUCTION,
    logLevel: ocpiConfig.logLevel,
    data: {
      sequelize: {
        host: ocpiConfig.database.host,
        port: ocpiConfig.database.port,
        database: ocpiConfig.database.database,
        dialect: 'postgres',
        username: ocpiConfig.database.username,
        password: ocpiConfig.database.password,
        storage: '',
        sync: ocpiConfig.database.sync,
      },
    },
    centralSystem: {
      host: ocpiConfig.ocpiServer.host,
      port: ocpiConfig.ocpiServer.port,
    },
    util: {
      cache: {
        redis: ocpiConfig.cache.redis || { host: 'localhost', port: 6379 },
      },
      messageBroker: { amqp: false },
      swagger: ocpiConfig.swagger,
      networkConnection: { websocketServers: [] },
    },
    ocpiServer: ocpiConfig.ocpiServer,
    modules: {},
    maxCallLengthSeconds: 30,
    maxCachingSeconds: 300,
  };
}

@Service()
export class OcpiSequelizeInstance {
  sequelize: Sequelize;
  private logger: Logger<ILogObj>;
  private config: OcpiConfig;
  private compatibleConfig: ServerConfig;

  constructor(config: OcpiConfig) {
    this.logger = this.logger = new Logger<ILogObj>({
      name: OcpiSequelizeInstance.name,
    });
    this.config = config;
    this.compatibleConfig = createCompatibleServerConfig(config);
    this.logger.info('Creating default Sequelize instance');

    this.sequelize = new Sequelize({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      dialect: 'postgres' as Dialect,
      username: config.database.username,
      password: config.database.password,
      storage: '',
      models: this.getModels(),
      logging: this.loggingCallback.bind(this),
    });
  }

  /**
   * Get a compatible ServerConfig for use with existing repositories
   */
  public getCompatibleConfig(): ServerConfig {
    return this.compatibleConfig;
  }

  public async initializeSequelize(): Promise<void> {
    let retryCount = 0;
    const maxRetries = 5; // Default retry count for OCPI
    const retryDelay = 5000; // Default retry delay for OCPI
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
      Evse,
      Version,
      VersionEndpoint,
      OcpiLocation,
      OcpiEvse,
      OcpiConnector,
      OcpiReservation,
      ResponseUrlCorrelationId,
      OcpiTariff,
      SessionChargingProfile,
      OcpiToken,
      Authorization,
      IdToken, // todo make IdToken be directly exported from data
      IdTokenInfo, // todo make IdTokenInfo be directly exported from data
      IdTokenAdditionalInfo,
      AdditionalInfo,
      ChargingStation,
      StatusNotification,
      Location,
      Reservation,
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
    if (this.config.database.sync) {
      this.sequelize.sync({ force: true }).then(() => {
        this.logger.info('Database synchronized');
      });
    }
  }
}
