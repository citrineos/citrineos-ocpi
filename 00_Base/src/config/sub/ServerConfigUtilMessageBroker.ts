import { ValidateNested } from 'class-validator';
import { Service } from 'typedi';
import { Type } from 'class-transformer';
import 'reflect-metadata';
import { Optional } from '../../util/decorators/Optional';
import { ServerConfigUtilMessageBrokerAmqp } from './ServerConfigUtilMessageBrokerAmqp';
import { ServerConfigUtilMessageBrokerPubSub } from './ServerConfigUtilMessageBrokerPubSub';
import { ServerConfigUtilMessageBrokerKafka } from './ServerConfigUtilMessageBrokerKafka';

@Service()
export class ServerConfigUtilMessageBroker {
  @Optional()
  @Type(() => ServerConfigUtilMessageBrokerAmqp)
  @ValidateNested()
  amqp?: ServerConfigUtilMessageBrokerAmqp;

  @Optional()
  @Type(() => ServerConfigUtilMessageBrokerPubSub)
  @ValidateNested()
  pubsub?: ServerConfigUtilMessageBrokerPubSub;

  @Optional()
  @Type(() => ServerConfigUtilMessageBrokerKafka)
  @ValidateNested()
  kafka?: ServerConfigUtilMessageBrokerKafka;

  constructor() {
    this.amqp = new ServerConfigUtilMessageBrokerAmqp();
  }
}
