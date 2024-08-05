import { Service } from 'typedi';
import { Enum } from '../util/decorators/enum';
import { IsInt, IsNotEmpty, IsPositive, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SequelizeConfig } from './sub/SequelizeConfig';
import { Env } from './sub/Env';
import { ServerConfigData } from './sub/ServerConfigData';
import { ServerConfigCentralSystem } from './sub/ServerConfigCentralSystem';
import { ServerConfigModules } from './sub/ServerConfigModules';
import { ServerConfigUtil } from './sub/ServerConfigUtil';
import { LogLevel } from './sub/LogLevel';
import { ServerConfigHostPort } from './sub/ServerConfigHostPort';

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
