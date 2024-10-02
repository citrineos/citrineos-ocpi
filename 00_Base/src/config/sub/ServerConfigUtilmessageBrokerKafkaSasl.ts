import { IsNotEmpty, IsString } from 'class-validator';
import 'reflect-metadata';

export class ServerConfigUtilmessageBrokerKafkaSasl {
  @IsString()
  @IsNotEmpty()
  mechanism: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  constructor(mechanism: string, username: string, password: string) {
    this.mechanism = mechanism;
    this.username = username;
    this.password = password;
  }
}
