import { IsBoolean, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { Service } from 'typedi';
import 'reflect-metadata';
import { Optional } from '../../util/decorators/Optional';

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

  @Optional()
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
  @Optional()
  sync?: boolean;

  @IsBoolean()
  @Optional()
  alter?: boolean;

  @IsInt()
  @Min(0)
  @Optional()
  maxRetries?: number;

  @IsInt()
  @Min(0)
  @Optional()
  retryDelay?: number;

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
