import { IsNotEmpty, IsString } from 'class-validator';
import 'reflect-metadata';
import { Optional } from '../../util/decorators/Optional';

export class ServerConfigUtilMessageBrokerPubSub {
  @IsString()
  @IsNotEmpty()
  topicPrefix: string;

  @IsString()
  @Optional()
  topicName?: string;

  @IsString()
  @Optional()
  servicePath?: string;

  constructor(topicPrefix: string) {
    this.topicPrefix = topicPrefix;
  }
}
