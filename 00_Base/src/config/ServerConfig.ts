import { Service } from 'typedi';
import { Enum } from '../util/decorators/Enum';
import { IsInt, IsNotEmpty, IsPositive, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  Env,
  LogLevel,
  SequelizeConfig,
  ServerConfigCentralSystem,
  ServerConfigData,
  ServerConfigHostPort,
  ServerConfigModules,
  ServerConfigUtil,
} from './sub';

@Service()
export class ServerConfig {
  @Enum(Env, 'Env')
  @IsNotEmpty()
  env = Env.DEVELOPMENT;

  @IsNotEmpty()
  @Type(() => ServerConfigData)
  @ValidateNested()
  centralSystem!: ServerConfigCentralSystem;

  @IsNotEmpty()
  @Type(() => ServerConfigModules)
  @ValidateNested()
  modules!: ServerConfigModules;

  @IsNotEmpty()
  @Type(() => ServerConfigData)
  @ValidateNested()
  data!: ServerConfigData;

  @IsNotEmpty()
  @Type(() => ServerConfigUtil)
  @ValidateNested()
  util!: ServerConfigUtil;

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

  @Type(() => ServerConfigHostPort)
  ocpiServer: ServerConfigHostPort;

  constructor() {
    this.data = new ServerConfigData();
    this.data.sequelize = new SequelizeConfig();
    this.util = new ServerConfigUtil();
    this.logLevel = LogLevel.DEBUG;
    this.ocpiServer = new ServerConfigHostPort('0.0.0.0', 8085);
    this.maxCallLengthSeconds = 30;
    this.maxCachingSeconds = 30;
  }
}
