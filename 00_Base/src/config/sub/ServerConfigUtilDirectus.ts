import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
} from 'class-validator';
import 'reflect-metadata';
import { Optional } from '../../util/decorators/Optional';

export class ServerConfigUtilDirectus {
  @IsString()
  @IsNotEmpty()
  host: string = '0.0.0.0';

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  port: number = 8055;

  @IsString()
  @Optional()
  token?: string = undefined;

  @IsString()
  @Optional()
  username?: string = undefined;

  @IsString()
  @Optional()
  password?: string = undefined;

  @IsBoolean()
  @IsNotEmpty()
  generateFlows: boolean = false;
}
