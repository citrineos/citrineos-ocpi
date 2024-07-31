import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
} from 'class-validator';
import { Service } from 'typedi';
import { Type } from 'class-transformer';
import { Enum } from '../util/decorators/enum';
import 'reflect-metadata';
import { Optional } from '../util/decorators/optional';
import { RegistrationStatusEnumType } from '@citrineos/base';

@Service()
class SequelizeConfig {
  @IsString()
  @IsNotEmpty()
  host!: string;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  port!: number;

  @IsString()
  @IsNotEmpty()
  database!: string;

  @IsOptional()
  dialect?: any;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  storage!: string;

  @IsBoolean()
  @IsOptional()
  sync?: boolean;

  @IsBoolean()
  @IsOptional()
  alter?: boolean;

  constructor(
    host: string,
    port: number,
    database: string,
    dialect: any,
    username: string,
    password: string,
    storage: string,
    sync?: boolean,
    alter?: boolean,
  ) {
    this.host = host;
    this.port = port;
    this.database = database;
    this.dialect = dialect;
    this.username = username;
    this.password = password;
    this.storage = storage;
    this.sync = sync;
    this.alter = alter;
  }
}

const defaultSequelizeConfig: SequelizeConfig = new SequelizeConfig(
  'localhost',
  5432,
  'citrine',
  'postgres',
  'citrine',
  'citrine',
  'squelize',
  false,
  true,
);

export enum LogLevel {
  SILLY = 0,
  TRACE = 1,
  DEBUG = 2,
  INFO = 3,
  WARN = 4,
  ERROR = 5,
  FATAL = 6,
}

export enum Env {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
}

@Service()
export class OcpiServerConfigData {
  @IsNotEmpty()
  @Type(() => SequelizeConfig)
  @ValidateNested()
  sequelize!: SequelizeConfig;
}

@Service()
export class OcpiServerConfigHostPort {
  @IsNotEmpty()
  host: string;

  @IsNotEmpty()
  port: number;

  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
  }
}

@Service()
export class OcpiServerConfigUtilCache {

  @IsBoolean()
  @Optional()
  memory?: boolean;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigHostPort)
  @ValidateNested()
  redis?: OcpiServerConfigHostPort;

  constructor() {
    this.memory = true;
  }
}

@Service()
export class OcpiServerConfigUtilMessageBrokerAmqp {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  exchange: string;

  constructor() {
    this.url = 'amqp://guest:guest@localhost:5672';
    this.exchange = 'citrineos';
  }
}

export class OcpiServerConfigUtilMessageBrokerPubSub {
  @IsString()
  @IsNotEmpty()
  topicPrefix:string;

  @IsString()
  @Optional()
  topicName?:string;

  @IsString()
  @Optional()
  servicePath?:string;
}

export class OcpiServerConfigUtilmessageBrokerKafkaSasl {
  @IsString()
  @IsNotEmpty()
  mechanism: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;


}

export class OcpiServerConfigUtilMessageBrokerKafka {
  @IsString()
  @Optional()
  topicPrefix?: string;

  @IsString()
  @Optional()
  topicName?: string;

  @IsArray()
  @IsNotEmpty()
  brokers: string[];

  @IsNotEmpty()
  @Type(() => OcpiServerConfigUtilmessageBrokerKafkaSasl)
  @ValidateNested()
  sasl: OcpiServerConfigUtilmessageBrokerKafkaSasl;

}

@Service()
export class OcpiServerConfigUtilMessageBroker {

  @Optional()
  @Type(() => OcpiServerConfigUtilMessageBrokerAmqp)
  @ValidateNested()
  amqp?: OcpiServerConfigUtilMessageBrokerAmqp;

  @Optional()
  @Type(() => OcpiServerConfigUtilMessageBrokerPubSub)
  @ValidateNested()
  pubsub: OcpiServerConfigUtilMessageBrokerPubSub;


  @Optional()
  @Type(() => OcpiServerConfigUtilMessageBrokerKafka)
  @ValidateNested()
  kafka: OcpiServerConfigUtilMessageBrokerKafka;

  constructor() {
    this.amqp = new OcpiServerConfigUtilMessageBrokerAmqp();
  }
}

export class OcpiServerConfigUtilSwagger {
  @IsString()
  @IsNotEmpty()
  path: string;

  @IsString()
  @IsNotEmpty()
  logoPath: string;

  @IsBoolean()
  @IsNotEmpty()
  exposeData: boolean;
  @IsBoolean()
  @IsNotEmpty()
  exposeMessage: boolean;
}

export class OcpiServerConfigUtilDirectus {
  @IsString()
  @IsNotEmpty()
  host: string;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  port: number;

  @IsString()
  @Optional()
  token?: string;

  @IsString()
  @Optional()
  username?: string;

  @IsString()
  @Optional()
  password?: string;

  @IsBoolean()
  @IsNotEmpty()
  generateFlows: boolean;
}

export class OcpiServerUtilNetworkConnectionWebsocketServer {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  port: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  pingInterval: number;

  @IsString()
  @IsNotEmpty()
  protocol: string;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Max(3)
  securityProfile: number;

  @IsNotEmpty()
  @IsBoolean()
  allowUnknownChargingStations: boolean;

  @IsString()
  @IsOptional()
  tlsKeyFilePath?: string;

  @IsString()
  @IsOptional()
  tlsCertificateChainFilePath?: string;

  @IsString()
  @IsOptional()
  mtlsCertificateAuthorityKeyFilePath?: string;

  @IsString()
  @IsOptional()
  rootCACertificateFilePath?: string;
}

export class OcpiServerConfigUtilNetworkConnection {

  @IsArray()
  @Type(() => OcpiServerUtilNetworkConnectionWebsocketServer)
  @ValidateNested({ each: true })
  @Validate((array: OcpiServerUtilNetworkConnectionWebsocketServer[]) => {
    const idsSeen = new Set<string>();
    return array.filter((obj) => {
      if (idsSeen.has(obj.id)) {
        return false;
      } else {
        switch (obj.securityProfile) {
          case 0: // No security
          case 1: // Basic Auth
            idsSeen.add(obj.id);
            return true;
          case 2: // Basic Auth + TLS
            return obj.tlsKeyFilePath && obj.tlsCertificateChainFilePath;
          case 3: // mTLS
            return (
              obj.tlsCertificateChainFilePath &&
              obj.tlsKeyFilePath &&
              obj.mtlsCertificateAuthorityKeyFilePath
            );
          default:
            return false;
        }
      }
    });
  })
  websocketServers: OcpiServerUtilNetworkConnectionWebsocketServer[]
}

export enum OcpiServerConfigUtilCertificateAuthorityV2gCAName {
  HUBJECT = 'hubject'
}

export enum OcpiServerConfigUtilCertificateAuthorityV2gCAHubjectIsoVersion {
  ISO15118_2 = 'ISO15118-2',
  ISO15118_20 = 'ISO15118-20'
}

export class OcpiServerConfigUtilCertificateAuthorityV2gCAHubject {
  @IsString()
  @IsNotEmpty()
  baseUrl: string;
  @IsString()
  @IsNotEmpty()
  tokenUrl: string;

  @Enum(OcpiServerConfigUtilCertificateAuthorityV2gCAHubjectIsoVersion, 'OcpiServerConfigUtilCertificateAuthorityV2gCAHubjectIsoVersion')
  @IsNotEmpty()
  isoVersion: OcpiServerConfigUtilCertificateAuthorityV2gCAHubjectIsoVersion;
}

export class OcpiServerConfigUtilCertificateAuthorityChargingStationCAAcme {
  @IsNotEmpty()
  @Enum(Env, 'Env')
  env: Env;

  @IsString()
  @IsNotEmpty()
  accountKeyFilePath: string;

  @IsString()
  @IsNotEmpty()
  email: string;
}

export enum OcpiServerConfigUtilCertificateAuthorityChargingStationCAName {
  ACME = 'acme'
}

export class OcpiServerConfigUtilCertificateAuthorityChargingStationCA {
  @Enum(OcpiServerConfigUtilCertificateAuthorityV2gCAName, 'OcpiServerConfigUtilCertificateAuthorityV2gCAName')
  @IsNotEmpty()
  name = OcpiServerConfigUtilCertificateAuthorityChargingStationCAName.ACME

  @Optional()
  @Type(() => OcpiServerConfigUtilCertificateAuthorityChargingStationCAAcme)
  @ValidateNested()
  acme?: OcpiServerConfigUtilCertificateAuthorityChargingStationCAAcme;
}

export class OcpiServerConfigUtilCertificateAuthorityV2gCA {

  @Enum(OcpiServerConfigUtilCertificateAuthorityV2gCAName, 'OcpiServerConfigUtilCertificateAuthorityV2gCAName')
  @IsNotEmpty()
  name = OcpiServerConfigUtilCertificateAuthorityV2gCAName.HUBJECT

  @Optional()
  @Type(() => OcpiServerConfigUtilCertificateAuthorityV2gCAHubject)
  @ValidateNested()
  hubject?: OcpiServerConfigUtilCertificateAuthorityV2gCAHubject;
}

export class OcpiServerConfigUtilCertificateAuthority {
  @IsNotEmpty()
  @Type(() => OcpiServerConfigUtilCertificateAuthorityV2gCA)
  @ValidateNested()
  v2gCA: OcpiServerConfigUtilCertificateAuthorityV2gCA;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigUtilCertificateAuthorityChargingStationCA)
  @ValidateNested()
  @Validate((obj: OcpiServerConfigUtilCertificateAuthorityChargingStationCA) => {
    if (obj.name === OcpiServerConfigUtilCertificateAuthorityChargingStationCAName.ACME) {
      return obj.acme;
    } else {
      return false;
    }
  })
  chargingStationCA: OcpiServerConfigUtilCertificateAuthorityChargingStationCA;
}

@Service()
export class OcpiServerConfigUtil {
  @IsNotEmpty()
  @Type(() => OcpiServerConfigUtilCache)
  @ValidateNested()
  @Validate((obj: OcpiServerConfigUtilCache) => obj.memory || obj.redis, {
    message: 'A cache implementation must be set',
  })
  cache: OcpiServerConfigUtilCache;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigUtilMessageBroker)
  @ValidateNested()
  @Validate((obj: OcpiServerConfigUtilMessageBroker) => obj.pubsub || obj.kafka || obj.amqp, {
    message: 'A message broker implementation must be set',
  })
  messageBroker: OcpiServerConfigUtilMessageBroker;

  @Optional()
  @Type(() => OcpiServerConfigUtilSwagger)
  @ValidateNested()
  swagger?: OcpiServerConfigUtilSwagger;

  @Optional()
  @Type(() => OcpiServerConfigUtilDirectus)
  @ValidateNested()
  directus?: OcpiServerConfigUtilDirectus;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigUtilNetworkConnection)
  @ValidateNested()
  networkConnection: OcpiServerConfigUtilNetworkConnection;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigUtilCertificateAuthority)
  @ValidateNested()
  certificateAuthority: OcpiServerConfigUtilCertificateAuthority;

  constructor() {
    this.cache = new OcpiServerConfigUtilCache();
    this.messageBroker = new OcpiServerConfigUtilMessageBroker();
  }
}

@Service()
export class OcpiServerConfigCentralSystem {
  @IsString()
  @IsNotEmpty()
  host: string;

  @IsInt()
  @IsPositive()
  port: number;

  constructor() {
    this.host = '0.0.0.0';
    this.port = 8080;
  }
}

export class EndpointPrefixHostPort {
  @IsString() endpointPrefix: string;
  @IsString() @Optional() host?: string;
  @IsInt() @Optional() @IsPositive() port?: number;
}

export class OcpiServerConfigModulesConfiguration {
  @IsInt()@IsPositive() heartbeatInterval!: number;
  @IsInt()@IsPositive() bootRetryInterval!: number;
  @IsNotEmpty() @Enum(RegistrationStatusEnumType, 'RegistrationStatusEnumType') unknownChargerStatus: RegistrationStatusEnumType; // Unknown chargers have no entry in BootConfig table
  @IsBoolean() @IsNotEmpty() getBaseReportOnPending!: boolean;
  @IsBoolean() @IsNotEmpty() bootWithRejectedVariables!: boolean;
  @IsBoolean() @IsNotEmpty() autoAccept!: boolean;
  @IsString() endpointPrefix!: string;
  @IsString() @Optional() host!: string;
  @IsInt()@IsPositive() @Optional() port!: number;
}

@Service()
export class OcpiServerConfigModulesCertificates extends EndpointPrefixHostPort {}
@Service()
export class OcpiServerConfigModulesEVDriver extends EndpointPrefixHostPort {}

@Service()
export class OcpiServerConfigModulesMonitoring extends EndpointPrefixHostPort {}

@Service()
export class OcpiServerConfigModulesReporting extends EndpointPrefixHostPort {}

@Service()
export class OcpiServerConfigModulesSmartCharging extends EndpointPrefixHostPort {}

@Service()
export class OcpiServerConfigModulesTenant extends EndpointPrefixHostPort {}

@Service()
export class OcpiServerConfigModulesTransactions extends EndpointPrefixHostPort {
  @IsInt()@IsPositive() @Optional() costUpdatedInterval: number;
  @IsBoolean()@Optional() sendCostUpdatedOnMeterValue: boolean;
}

export class OcpiServerConfigModules {
  @Optional()
  @Type(() => OcpiServerConfigModulesCertificates)
  @ValidateNested()
  certificates!: OcpiServerConfigModulesCertificates;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigUtilCache)
  @ValidateNested()
  evdriver!: OcpiServerConfigModulesEVDriver;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigModulesConfiguration)
  @ValidateNested()
  configuration!: OcpiServerConfigModulesConfiguration;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigModulesMonitoring)
  @ValidateNested()
  monitoring!: OcpiServerConfigModulesMonitoring;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigModulesReporting)
  @ValidateNested()
  reporting!: OcpiServerConfigModulesReporting;

  @Optional()
  @Type(() => OcpiServerConfigModulesSmartCharging)
  @ValidateNested()
  smartcharging!: OcpiServerConfigModulesSmartCharging;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigModulesTenant)
  @ValidateNested()
  tenant!: OcpiServerConfigModulesTenant;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigModulesTransactions)
  @ValidateNested()
  @Validate((obj: OcpiServerConfigModulesTransactions, args: ValidationArguments) => {
      return (!(obj.costUpdatedInterval && obj.sendCostUpdatedOnMeterValue) &&
        (obj.costUpdatedInterval || obj.sendCostUpdatedOnMeterValue)) as boolean;
  }, {
    message: 'Can only update cost based on the interval or in response to a transaction event /meter value' +
      ' update. Not allowed to have both costUpdatedInterval and sendCostUpdatedOnMeterValue configured'
  })
  transactions!: OcpiServerConfigModulesTransactions;
}






@Service()
export class OcpiServerConfig {
  @Enum(Env, 'OcpiEnv')
  @IsNotEmpty()
  env = Env.DEVELOPMENT;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigData)
  @ValidateNested()
  centralSystem!: OcpiServerConfigCentralSystem;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigModules)
  @ValidateNested()
  modules!: OcpiServerConfigModules;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigData)
  @ValidateNested()
  data!: OcpiServerConfigData;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigUtil)
  @ValidateNested()
  util!: OcpiServerConfigUtil;

  @Enum(LogLevel, 'LogLevel')
  @IsNotEmpty()
  logLevel: LogLevel;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  maxCallLengthSeconds: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  maxCachingSeconds: number;

  @Type(() => OcpiServerConfigHostPort)
  ocpiServer: OcpiServerConfigHostPort;

  constructor() {
    this.data = new OcpiServerConfigData();
    this.data.sequelize = defaultSequelizeConfig; // todo envs
    this.util = new OcpiServerConfigUtil();
    this.logLevel = LogLevel.DEBUG;
    this.ocpiServer = new OcpiServerConfigHostPort('0.0.0.0', 8085);
  }
}
