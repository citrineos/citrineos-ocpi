import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Service } from 'typedi';
import 'reflect-metadata';

@Service()
export class SequelizeConfig {
  @IsString()
  @IsNotEmpty()
  host: string;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  port: number;

  @IsString()
  @IsNotEmpty()
  database: string;

  @IsOptional()
  dialect?: any;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  storage: string;

  @IsBoolean()
  @IsOptional()
  sync?: boolean;

  @IsBoolean()
  @IsOptional()
  alter?: boolean;

  constructor() {
    this.host = 'localhost';
    this.port = 5432;
    this.database = 'citrine';
    this.dialect = 'postgres';
    this.username = 'citrine';
    this.password = 'citrine';
    this.storage = '';
    this.sync = false;
    this.alter = true;
  }
}
