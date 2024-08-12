import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested, } from 'class-validator';
import { Service } from 'typedi';
import { Type } from 'class-transformer';
import { Enum } from '../util/decorators/enum';
import 'reflect-metadata';

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

  @IsNumber()
  @IsOptional()
  maxRetries?: number;

  @IsNumber()
  @IsOptional()
  retryDelay?: number;

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

export enum OcpiEnv {
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
  // TODO add other caches

  memory?: boolean;

  redis?: OcpiServerConfigHostPort;

  constructor() {
    this.memory = true;
  }
}

@Service()
export class OcpiServerConfigAMQPConfig {
  @IsNotEmpty()
  url: string;

  @IsNotEmpty()
  exchange: string;

  constructor() {
    this.url = 'amqp://guest:guest@localhost:5672';
    this.exchange = 'citrineos';
  }
}

@Service()
export class OcpiServerConfigUtilMessageBroker {
  // TODO add different brokers

  amqp: OcpiServerConfigAMQPConfig;

  constructor() {
    this.amqp = new OcpiServerConfigAMQPConfig();
  }
}

@Service()
export class OcpiServerConfigUtil {
  @IsNotEmpty()
  @Type(() => OcpiServerConfigUtilCache)
  cache: OcpiServerConfigUtilCache;

  @IsNotEmpty()
  @Type(() => OcpiServerConfigUtilMessageBroker)
  messageBroker: OcpiServerConfigUtilMessageBroker;

  constructor() {
    this.cache = new OcpiServerConfigUtilCache();
    this.messageBroker = new OcpiServerConfigUtilMessageBroker();
  }
}

@Service()
export class OcpiServerConfig {
  @Enum(OcpiEnv, 'OcpiEnv')
  @IsNotEmpty()
  env = OcpiEnv.DEVELOPMENT;

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
