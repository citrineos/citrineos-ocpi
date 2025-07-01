import { IsBoolean, IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';
import 'reflect-metadata';
import { Optional } from '../../util/decorators/Optional';

export class ServerConfigUtilDirectus {
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

  constructor() {
    this.host = '0.0.0.0';
    this.port = 8055;
    this.generateFlows = false;
  }
}
