import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';
import { Service } from 'typedi';
import 'reflect-metadata';

@Service()
export class ServerConfigCentralSystem {
  @IsString()
  @IsNotEmpty()
  host: string;

  @IsInt()
  @IsPositive()
  port: number;

  constructor() {
    this.host = '0.0.0.0';
    this.port = 8080;
  }
}
