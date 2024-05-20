import {IsBoolean, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString} from "class-validator";
import {injectable} from "tsyringe";

class SequelizeConfig {

  @IsString()
  @IsNotEmpty()
  host!: string;

  @IsInt()
  @IsPositive()
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
  '',
  false,
  true,
);

@injectable()
export class OcpiServerConfig {
  sequelize!: SequelizeConfig;


  constructor() {
    this.sequelize = defaultSequelizeConfig; // todo envs
  }
}
