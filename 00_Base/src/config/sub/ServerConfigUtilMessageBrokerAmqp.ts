import { IsNotEmpty, IsString } from 'class-validator';
import { Service } from 'typedi';
import 'reflect-metadata';

@Service()
export class ServerConfigUtilMessageBrokerAmqp {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  exchange: string;

  constructor() {
    this.url = 'amqp://guest:guest@localhost:5672';
    this.exchange = 'citrineos';
  }
}
