import { IsNotEmpty, Validate, ValidateNested } from 'class-validator';
import { Service } from 'typedi';
import { Type } from 'class-transformer';
import 'reflect-metadata';
import { ServerConfigUtilCache } from './ServerConfigUtilCache';
import { ServerConfigUtilMessageBroker } from './ServerConfigUtilMessageBroker';
import { Optional } from '../../util/decorators/Optional';
import { ServerConfigUtilSwagger } from './ServerConfigUtilSwagger';
import { ServerConfigUtilDirectus } from './ServerConfigUtilDirectus';
import { ServerConfigUtilNetworkConnection } from './ServerConfigUtilNetworkConnection';
import { ServerConfigUtilCertificateAuthority } from './ServerConfigUtilCertificateAuthority';

@Service()
export class ServerConfigUtil {
  @IsNotEmpty()
  @Type(() => ServerConfigUtilCache)
  @ValidateNested()
  @Validate((obj: ServerConfigUtilCache) => obj.memory || obj.redis, {
    message: 'A cache implementation must be set',
  })
  cache: ServerConfigUtilCache;

  @IsNotEmpty()
  @Type(() => ServerConfigUtilMessageBroker)
  @ValidateNested()
  @Validate(
    (obj: ServerConfigUtilMessageBroker) => obj.pubsub || obj.kafka || obj.amqp,
    {
      message: 'A message broker implementation must be set',
    },
  )
  messageBroker: ServerConfigUtilMessageBroker;

  @Optional()
  @Type(() => ServerConfigUtilSwagger)
  @ValidateNested()
  swagger?: ServerConfigUtilSwagger;

  @Optional()
  @Type(() => ServerConfigUtilDirectus)
  @ValidateNested()
  directus?: ServerConfigUtilDirectus;

  @IsNotEmpty()
  @Type(() => ServerConfigUtilNetworkConnection)
  @ValidateNested()
  networkConnection: ServerConfigUtilNetworkConnection;

  @IsNotEmpty()
  @Type(() => ServerConfigUtilCertificateAuthority)
  @ValidateNested()
  certificateAuthority: ServerConfigUtilCertificateAuthority;

  constructor() {
    this.cache = new ServerConfigUtilCache();
    this.messageBroker = new ServerConfigUtilMessageBroker();
    this.swagger = new ServerConfigUtilSwagger();
    this.directus = new ServerConfigUtilDirectus();
    this.networkConnection = new ServerConfigUtilNetworkConnection();
    this.certificateAuthority = new ServerConfigUtilCertificateAuthority();
  }
}
