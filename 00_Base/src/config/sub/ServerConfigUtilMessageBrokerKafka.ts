import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import 'reflect-metadata';
import { Optional } from '../../util/decorators/optional';
import { ServerConfigUtilmessageBrokerKafkaSasl } from './ServerConfigUtilmessageBrokerKafkaSasl';

export class ServerConfigUtilMessageBrokerKafka {
  @IsString()
  @Optional()
  topicPrefix?: string;

  @IsString()
  @Optional()
  topicName?: string;

  @IsArray()
  @IsNotEmpty()
  brokers: string[];

  @IsNotEmpty()
  @Type(() => ServerConfigUtilmessageBrokerKafkaSasl)
  @ValidateNested()
  sasl: ServerConfigUtilmessageBrokerKafkaSasl;

  constructor(brokers: string[], sasl: ServerConfigUtilmessageBrokerKafkaSasl) {
    this.brokers = brokers;
    this.sasl = sasl;
  }
}
