import { IsNotEmpty } from 'class-validator';
import { Service } from 'typedi';
import 'reflect-metadata';

@Service()
export class ServerConfigHostPort {
  @IsNotEmpty()
  host: string;

  @IsNotEmpty()
  port: number;

  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
  }
}
