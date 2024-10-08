import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';
import { Service } from 'typedi';
import 'reflect-metadata';

@Service()
export class ServerConfigCentralSystem {
  @IsString()
  @IsNotEmpty()
  host: string = '0.0.0.0';

  @IsInt()
  @IsPositive()
  port: number = 8080;
}
