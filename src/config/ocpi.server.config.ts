import {IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested} from 'class-validator';
import {Service} from 'typedi';
import {Type} from 'class-transformer';
import {Enum} from '../util/decorators/enum';
import 'reflect-metadata';

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
    alter?: boolean
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
  FATAL = 6
}

export enum OcpiEnv {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
}

export class OcpiServerConfigData {
  @IsNotEmpty()
  @Type(() => SequelizeConfig)
  @ValidateNested()
  sequelize!: SequelizeConfig;
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

  @Enum(LogLevel, 'LogLevel')
  @IsNotEmpty()
  logLevel: LogLevel;


  constructor() {
    this.data = new OcpiServerConfigData();
    this.data.sequelize = defaultSequelizeConfig; // todo envs
    this.logLevel = LogLevel.DEBUG;
  }
}
