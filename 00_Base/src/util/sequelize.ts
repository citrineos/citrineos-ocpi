import {
  AdditionalInfo,
  Authorization,
  ChargingStation,
  Evse,
  IdToken,
  IdTokenAdditionalInfo,
  IdTokenInfo,
  Location,
  MeterValue,
  Sequelize,
  Transaction,
  TransactionEvent,
} from '@citrineos/data';
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
import { OcpiToken } from '../model/OcpiToken';
import { OcpiLocation } from '../model/OcpiLocation';
import { OcpiEvse } from '../model/OcpiEvse';
import { OcpiConnector } from '../model/OcpiConnector';
import { ResponseUrlCorrelationId } from '../model/ResponseUrlCorrelationId';
import { OcpiTariff } from '../model/OcpiTariff';
import { SessionChargingProfile } from '../model/SessionChargingProfile';
import { AsyncJobStatus } from '../model/AsyncJobStatus';
import {
  createViewTransactionsWithPartyIdAndCountryCodeSql,
  dropViewTransactionsWithPartyIdAndCountryCodeSql,
} from '../sql/ViewTransactionsWithPartyIdAndCountryCode';
import { StatusNotification } from '@citrineos/data/dist/layers/sequelize/model/Location/StatusNotification';
import { ViewTransactionsWithPartyIdAndCountryCode } from '../model/view/ViewTransactionsWithPartyIdAndCountryCode';

export const ON_DELETE_RESTRICT = 'RESTRICT';
export const ON_DELETE_CASCADE = 'CASCADE';
export const ON_DELETE_NO_ACTION = 'NO_ACTION';
export const ON_DELETE_SET_DEFAULT = 'SET_DEFAULT';
export const ON_DELETE_SET_NULL = 'SET NULL';

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
        TransactionEvent,
        Location,
        ChargingStation,
        StatusNotification,
        Evse,
        MeterValue,
        Transaction,
        ViewTransactionsWithPartyIdAndCountryCode
      ],
      logging: (_sql: string, _timing?: number) => {
        // TODO: Look into fixing that
        // sequelizeLogger.debug(timing, sql);
      },
    });
    handleSequelizeSync(this.sequelize, config, sequelizeLogger).then();
  }
}

const dropViews = async (sequelize: Sequelize): Promise<void> => {
  await sequelize.query(dropViewTransactionsWithPartyIdAndCountryCodeSql);
}

const createViews = async (sequelize: Sequelize): Promise<void> => {
  await sequelize.query(createViewTransactionsWithPartyIdAndCountryCodeSql);
}

export const handleSequelizeSync = async (
  sequelize: Sequelize,
  config: OcpiServerConfig,
  logger: Logger<ILogObj>
): Promise<void> => {

  let syncOpts = undefined;
  if (config.data.sequelize.alter) {
    syncOpts = { alter: true };
  } else if (config.data.sequelize.sync) {
    syncOpts = { force: true };
  }
  if (syncOpts) {
    // drop views to prevent conflicts
    await dropViews(sequelize);
    await sequelize.sync(syncOpts).then(() => {
      logger.info('Database altered');
    });
    // recreate views
    await createViews(sequelize);
  }

}
