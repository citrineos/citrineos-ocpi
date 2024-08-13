import { IsNotEmpty, ValidateNested } from 'class-validator';
import { Service } from 'typedi';
import { Type } from 'class-transformer';
import 'reflect-metadata';
import { SequelizeConfig } from './SequelizeConfig';

@Service()
export class ServerConfigData {
  @IsNotEmpty()
  @Type(() => SequelizeConfig)
  @ValidateNested()
  sequelize!: SequelizeConfig;
}
